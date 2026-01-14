"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  AppStore,
  AppState,
  AppAction,
  Goal,
  Context,
  Tag,
  TimeEntry,
} from "./types";
import { createAppStore } from "./createStore";
import { initializeStore } from "./loader";
import { initSync } from "./sync";
import {
  selectGoalsForDate,
  selectStatusMapForDate,
  selectTimeSecondsForGoal,
  selectCheckStateForGoal,
  selectTimeSecondsMap,
  selectCheckStatesMap,
  selectDayStatusMap,
  type DayStatusCounts,
} from "./selectors";

// =============================================================================
// CONTEXT
// =============================================================================

const AppStoreContext = createContext<AppStore | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  // Use useState with lazy init to create store once
  const [store] = useState(() => createAppStore());

  // Initialize on mount
  useEffect(() => {
    initSync(store);
    const state = store.getState();
    if (!state.isInitialized && !state.isLoading) {
      void initializeStore(store);
    }
  }, [store]);

  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  );
}

// =============================================================================
// BASE HOOK
// =============================================================================

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useStore must be used within AppStoreProvider");
  }
  return store;
}

export function useStoreSelector<T>(selector: (state: AppState) => T): T {
  const store = useAppStore();
  const lastRef = useRef<{
    state: AppState | null;
    selector: ((state: AppState) => T) | null;
    value: T | null;
  }>({ state: null, selector: null, value: null });

  const getSnapshot = () => {
    const state = store.getState();
    if (
      lastRef.current.state === state &&
      lastRef.current.selector === selector
    ) {
      return lastRef.current.value as T;
    }
    const value = selector(state);
    lastRef.current = { state, selector, value };
    return value;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useAppState(): AppState {
  const store = useAppStore();
  return store.getState();
}

// =============================================================================
// SLICE HOOKS (granular subscriptions to avoid re-renders)
// =============================================================================

/**
 * Raw dispatch function
 */
export function useDispatch(): (action: AppAction) => void {
  const store = useAppStore();
  return store.dispatch;
}

/**
 * Loading/initialization state
 */
export function useStoreStatus() {
  return useStoreSelector((state) => ({
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    loadError: state.loadError,
    syncError: state.syncError,
    hasPendingMutations: state.pendingMutations.length > 0,
  }));
}

/**
 * All contexts (sorted by name)
 */
export function useAppContexts(): {
  contexts: Context[];
  isLoading: boolean;
} {
  const contexts = useStoreSelector((state) => state.contexts);
  const isLoading = useStoreSelector((state) => !state.isInitialized);
  return { contexts, isLoading };
}

/**
 * All tags (sorted by name)
 */
export function useAppTags(): {
  tags: Tag[];
  isLoading: boolean;
} {
  const tags = useStoreSelector((state) => state.tags);
  const isLoading = useStoreSelector((state) => !state.isInitialized);
  return { tags, isLoading };
}

/**
 * Active timer entry
 */
export function useActiveTimer(): {
  activeTimer: TimeEntry | null;
  isLoading: boolean;
} {
  const activeTimer = useStoreSelector((state) => state.activeTimer);
  const isLoading = useStoreSelector((state) => !state.isInitialized);
  return { activeTimer, isLoading };
}

/**
 * Goals for a specific date
 */
export function useGoalsForDate(date: Date): {
  goals: Goal[];
  isLoading: boolean;
} {
  const dateKey = useMemo(() => toISODate(date), [date]);
  const goals = useStoreSelector((state) =>
    selectGoalsForDate(state, new Date(dateKey)),
  );

  const isLoading = useStoreSelector((state) => !state.isInitialized);
  return { goals, isLoading };
}

/**
 * Status map for goals on a date (computed locally)
 */
export function useGoalStatusMap(
  goals: Goal[],
  date: Date,
): Record<string, { status: string; actual_value: number }> {
  const dateKey = useMemo(() => toISODate(date), [date]);
  return useStoreSelector((state) =>
    selectStatusMapForDate(state, goals, new Date(dateKey)),
  );
}

/**
 * Time seconds for a specific goal (for timer display)
 */
export function useTimeSecondsForGoal(goalId: string, date: Date): number {
  const dateKey = useMemo(() => toISODate(date), [date]);
  return useStoreSelector((state) =>
    selectTimeSecondsForGoal(state, goalId, new Date(dateKey)),
  );
}

/**
 * Check state for a goal
 */
export function useCheckStateForGoal(goalId: string, date: Date): boolean {
  const dateKey = useMemo(() => toISODate(date), [date]);
  return useStoreSelector((state) =>
    selectCheckStateForGoal(state, goalId, new Date(dateKey)),
  );
}

/**
 * Day status map for calendar
 */
export function useDayStatusMapFromStore(days: Date[]): {
  statusMap: Record<string, DayStatusCounts>;
  isLoading: boolean;
} {
  const daysKey = useMemo(
    () => days.map((d) => toISODate(d)).join(","),
    [days],
  );
  const statusMap = useStoreSelector((state) => {
    if (!state.isInitialized) return {};
    const dayDates = daysKey
      .split(",")
      .filter(Boolean)
      .map((k) => new Date(k));
    return selectDayStatusMap(state, dayDates);
  });

  const isLoading = useStoreSelector((state) => !state.isInitialized);
  return { statusMap, isLoading };
}

/**
 * Single goal by ID
 */
export function useGoalById(goalId: string): Goal | null {
  return useStoreSelector(
    (state) => state.goals.find((g) => g.id === goalId) ?? null,
  );
}

/**
 * Time entries for a goal (for goal details page)
 */
export function useTimeEntriesForGoal(goalId: string): TimeEntry[] {
  return useStoreSelector((state) =>
    state.timeEntries
      .filter((e) => e.goal_id === goalId)
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      ),
  );
}

/**
 * Bulk time seconds map for multiple goals
 */
export function useTimeSecondsMap(
  goals: Goal[],
  date: Date,
): Record<string, number> {
  const dateKey = useMemo(() => toISODate(date), [date]);
  return useStoreSelector((state) =>
    selectTimeSecondsMap(state, goals, new Date(dateKey)),
  );
}

/**
 * Bulk check states map for multiple goals
 */
export function useCheckStatesMap(
  goals: Goal[],
  date: Date,
): Record<string, boolean> {
  const dateKey = useMemo(() => toISODate(date), [date]);
  return useStoreSelector((state) =>
    selectCheckStatesMap(state, goals, new Date(dateKey)),
  );
}

/**
 * All time entries (for time-logs page)
 */
export function useAllTimeEntries(): TimeEntry[] {
  return useStoreSelector((state) => state.timeEntries);
}

/**
 * Counter events for a goal
 */
export function useCounterEventsForGoal(goalId: string) {
  return useStoreSelector((state) =>
    state.counterEvents
      .filter((e) => e.goal_id === goalId)
      .sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      ),
  );
}

/**
 * Check events for a goal
 */
export function useCheckEventsForGoal(goalId: string) {
  return useStoreSelector((state) =>
    state.checkEvents
      .filter((e) => e.goal_id === goalId)
      .sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      ),
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
