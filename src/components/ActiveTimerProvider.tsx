"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";

type ActiveTimeEntry = {
  id: string;
  goal_id: string | null;
  context_id: string;
  started_at: string;
};

type ActiveTimerContextValue = {
  activeEntry: ActiveTimeEntry | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startTimer: (payload: {
    contextId: string;
    goalId?: string | null;
  }) => Promise<{ error?: string | { key: string; params?: any }; entryId?: string }>;
  stopTimer: (endedAt?: string) => Promise<{ error?: string | { key: string; params?: any } }>;
};

const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

async function fetchActiveEntry() {
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, goal_id, context_id, started_at, ended_at")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { entry: null, error: error.message };
  }

  if (!data) {
    return { entry: null, error: null };
  }

  return {
    entry: {
      id: data.id,
      goal_id: data.goal_id ?? null,
      context_id: data.context_id,
      started_at: data.started_at,
    },
    error: null,
  };
}

export function ActiveTimerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingStartRef = useRef<Promise<{ id: string } | null> | null>(null);
  const pendingOptimisticIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { entry, error: fetchError } = await fetchActiveEntry();
    setActiveEntry(entry);
    setError(fetchError);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const startTimer = useCallback(
    async ({
      contextId,
      goalId,
    }: {
      contextId: string;
      goalId?: string | null;
    }) => {
      // Check if there's already an active timer in DB
      const { entry: existingEntry } = await fetchActiveEntry();
      if (existingEntry) {
        return { error: { key: "errors.timerAlreadyRunning" } };
      }

      const { userId, error: userError } = await getCurrentUserId();
      if (userError) {
        return { error: { key: "errors.loginRequired" } };
      }
      if (!userId) {
        return { error: { key: "errors.loginRequired" } };
      }

      const startedAt = new Date().toISOString();
      const optimisticId = `optimistic-${Date.now()}`;
      const previousEntry = activeEntry;

      setActiveEntry({
        id: optimisticId,
        goal_id: goalId ?? null,
        context_id: contextId,
        started_at: startedAt,
      });

      const insertPromise = (async () => {
        const result = await supabase
          .from("time_entries")
          .insert({
            user_id: userId,
            context_id: contextId,
            goal_id: goalId ?? null,
            started_at: startedAt,
          })
          .select("id")
          .single();
        return result.error ? null : result.data;
      })();

      pendingStartRef.current = insertPromise;
      pendingOptimisticIdRef.current = optimisticId;

       const data = await insertPromise;

       pendingStartRef.current = null;
       pendingOptimisticIdRef.current = null;

       if (!data?.id) {
         // Check if another timer was started meanwhile
         const { entry: checkEntry } = await fetchActiveEntry();
         if (checkEntry) {
           await refresh();
           return { error: { key: "errors.timerAlreadyRunning" } };
         }
         setActiveEntry(previousEntry ?? null);
         return { error: { key: "errors.failedToStartTimer" } };
       }

      setActiveEntry({
        id: data.id,
        goal_id: goalId ?? null,
        context_id: contextId,
        started_at: startedAt,
      });

      await refresh();
      return { entryId: data.id };
    },
    [activeEntry, refresh],
  );

  const stopTimer = useCallback(
    async (endedAt?: string) => {
      if (!activeEntry) {
        return { error: { key: "errors.noActiveTimer" } };
      }

      const finalEndedAt = endedAt ?? new Date().toISOString();
      const optimisticId = pendingOptimisticIdRef.current;
      if (optimisticId && activeEntry.id === optimisticId) {
        const pendingStart = pendingStartRef.current;
        if (!pendingStart) {
          setActiveEntry(null);
          return {};
        }
        const data = await pendingStart;
        if (!data?.id) {
          setActiveEntry(null);
          return { error: { key: "errors.failedToStopTimer" } };
        }

        // Check if already stopped
        const { data: checkData, error: checkError } = await supabase
          .from("time_entries")
          .select("ended_at")
          .eq("id", data.id)
          .single();

        if (checkError) {
          return { error: checkError.message };
        }
        if (checkData?.ended_at) {
          await refresh();
          return { error: { key: "errors.timerAlreadyStopped" } };
        }

        const { error: updateError } = await supabase
          .from("time_entries")
          .update({ ended_at: finalEndedAt })
          .eq("id", data.id);

        if (updateError) {
          return { error: updateError.message };
        }

        setActiveEntry(null);
        await refresh();
        return {};
      }

      // Check if already stopped
      const { data: checkData, error: checkError } = await supabase
        .from("time_entries")
        .select("ended_at")
        .eq("id", activeEntry.id)
        .single();

      if (checkError) {
        return { error: checkError.message };
      }
      if (checkData?.ended_at) {
        await refresh();
        return { error: { key: "errors.timerAlreadyStopped" } };
      }

      const { error: updateError } = await supabase
        .from("time_entries")
        .update({ ended_at: finalEndedAt })
        .eq("id", activeEntry.id);

      if (updateError) {
        return { error: updateError.message };
      }

      await refresh();
      return {};
    },
    [activeEntry, refresh],
  );

  const value = useMemo(
    () => ({
      activeEntry,
      isLoading,
      error,
      refresh,
      startTimer,
      stopTimer,
    }),
    [activeEntry, error, isLoading, refresh, startTimer, stopTimer],
  );

  return (
    <ActiveTimerContext.Provider value={value}>
      {children}
    </ActiveTimerContext.Provider>
  );
}

export function useActiveTimer() {
  const context = useContext(ActiveTimerContext);
  if (!context) {
    throw new Error("useActiveTimer must be used within ActiveTimerProvider");
  }
  return context;
}
