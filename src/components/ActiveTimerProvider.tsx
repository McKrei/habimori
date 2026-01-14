"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  useAppStore,
  useActiveTimer as useStoreActiveTimer,
  startTimerImmediate,
  stopTimerImmediate
} from "@/src/store";

// Use precise types from store where possible, but mapped to old interface
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
    tagIds?: string[];
  }) => Promise<{ error?: string | { key: string; params?: Record<string, string | number> }; entryId?: string }>;
  stopTimer: (endedAt?: string) => Promise<{ error?: string | { key: string; params?: Record<string, string | number> } }>;
};

const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

export function ActiveTimerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = useAppStore();
  const { activeTimer: storeEntry, isLoading } = useStoreActiveTimer();

  // Map store entry to local type (should match exactly mostly)
  const activeEntry: ActiveTimeEntry | null = useMemo(() => {
    if (!storeEntry) return null;
    return {
      id: storeEntry.id,
      goal_id: storeEntry.goal_id,
      context_id: storeEntry.context_id,
      started_at: storeEntry.started_at
    };
  }, [storeEntry]);

  const refresh = useCallback(async () => {
    // No-op effectively, store handles sync
  }, []);

  const startTimer = useCallback(async ({ contextId, goalId, tagIds }: { contextId: string; goalId?: string | null; tagIds?: string[] }) => {
    const result = await startTimerImmediate(store, contextId, goalId ?? null, tagIds ?? []);
    if (result.error) {
       // Map string error to object if needed by consumers, or just return string if they handle generic
       return { error: result.error };
    }
    return { entryId: result.entryId };
  }, [store]);

  const stopTimer = useCallback(async (endedAt?: string) => {
    const result = await stopTimerImmediate(store, endedAt);
    if (result.error) {
      return { error: result.error };
    }
    return {};
  }, [store]);

  const value = useMemo(
    () => ({
      activeEntry,
      isLoading,
      error: null, // Store handles errors internally mostly
      refresh,
      startTimer,
      stopTimer,
    }),
    [activeEntry, isLoading, refresh, startTimer, stopTimer]
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
