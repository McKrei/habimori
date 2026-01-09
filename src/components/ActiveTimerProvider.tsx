"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  }) => Promise<{ error?: string; entryId?: string }>;
  stopTimer: () => Promise<{ error?: string }>;
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

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { entry, error: fetchError } = await fetchActiveEntry();
    setActiveEntry(entry);
    setError(fetchError);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startTimer = useCallback(
    async ({
      contextId,
      goalId,
    }: {
      contextId: string;
      goalId?: string | null;
    }) => {
      if (activeEntry) {
        return { error: "Another timer is already running." };
      }

      const { userId, error: userError } = await getCurrentUserId();
      if (userError) {
        return { error: userError };
      }
      if (!userId) {
        return { error: "Please log in to start a timer." };
      }

      const { data, error: insertError } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          context_id: contextId,
          goal_id: goalId ?? null,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        return { error: insertError.message };
      }

      await refresh();
      return { entryId: data?.id };
    },
    [activeEntry, refresh],
  );

  const stopTimer = useCallback(async () => {
    if (!activeEntry) {
      return { error: "No active timer to stop." };
    }

    const { error: updateError } = await supabase
      .from("time_entries")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", activeEntry.id);

    if (updateError) {
      return { error: updateError.message };
    }

    await refresh();
    return {};
  }, [activeEntry, refresh]);

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
