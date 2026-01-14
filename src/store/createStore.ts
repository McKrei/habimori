"use client";

import type { AppState, AppAction, AppStore } from "./types";

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialState: AppState = {
  userId: null,
  goals: [],
  contexts: [],
  tags: [],
  timeEntries: [],
  counterEvents: [],
  checkEvents: [],
  goalPeriods: [],
  activeTimer: null,
  isInitialized: false,
  isLoading: false,
  loadError: null,
  pendingMutations: [],
  syncError: null,
};

// =============================================================================
// REDUCER
// =============================================================================

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Initialization
    case "INIT_START":
      return { ...state, isLoading: true, loadError: null };

    case "INIT_SUCCESS":
      return {
        ...state,
        userId: action.payload.userId,
        goals: action.payload.goals,
        contexts: action.payload.contexts,
        tags: action.payload.tags,
        timeEntries: action.payload.timeEntries,
        counterEvents: action.payload.counterEvents,
        checkEvents: action.payload.checkEvents,
        goalPeriods: action.payload.goalPeriods,
        activeTimer: action.payload.activeTimer,
        isInitialized: true,
        isLoading: false,
        loadError: null,
      };

    case "INIT_ERROR":
      return { ...state, isLoading: false, loadError: action.error };

    // Goals
    case "ADD_GOAL":
      return { ...state, goals: [action.goal, ...state.goals] };

    case "UPDATE_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId ? { ...g, ...action.updates } : g,
        ),
      };

    case "ARCHIVE_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId ? { ...g, is_archived: true } : g,
        ),
      };

    // Contexts
    case "ADD_CONTEXT":
      return {
        ...state,
        contexts: [...state.contexts, action.context].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      };

    case "UPDATE_CONTEXT":
      return {
        ...state,
        contexts: state.contexts
          .map((c) =>
            c.id === action.contextId ? { ...c, name: action.name } : c,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      };

    case "DELETE_CONTEXT":
      return {
        ...state,
        contexts: state.contexts.filter((c) => c.id !== action.contextId),
        goals: state.goals.filter((g) => g.context_id !== action.contextId),
        timeEntries: state.timeEntries.filter(
          (e) => e.context_id !== action.contextId,
        ),
        counterEvents: state.counterEvents.filter(
          (e) => e.context_id !== action.contextId,
        ),
        checkEvents: state.checkEvents.filter(
          (e) => e.context_id !== action.contextId,
        ),
      };

    // Tags
    case "ADD_TAG":
      return {
        ...state,
        tags: [...state.tags, action.tag].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      };

    case "UPDATE_TAG":
      return {
        ...state,
        tags: state.tags
          .map((t) => (t.id === action.tagId ? { ...t, name: action.name } : t))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };

    case "DELETE_TAG":
      return {
        ...state,
        tags: state.tags.filter((t) => t.id !== action.tagId),
        goals: state.goals.map((g) => ({
          ...g,
          tags: g.tags.filter((t) => t.id !== action.tagId),
        })),
        timeEntries: state.timeEntries.map((e) => ({
          ...e,
          tag_ids: e.tag_ids.filter((id) => id !== action.tagId),
        })),
      };

    // Events
    case "ADD_COUNTER_EVENT":
      return {
        ...state,
        counterEvents: [action.event, ...state.counterEvents],
      };

    case "ADD_CHECK_EVENT":
      return {
        ...state,
        checkEvents: [action.event, ...state.checkEvents],
      };

    case "ADD_TIME_ENTRY":
      return {
        ...state,
        timeEntries: [action.entry, ...state.timeEntries],
      };

    case "UPDATE_TIME_ENTRY":
      return {
        ...state,
        timeEntries: state.timeEntries.map((e) =>
          e.id === action.entryId ? { ...e, ...action.updates } : e,
        ),
      };

    case "DELETE_TIME_ENTRY":
      return {
        ...state,
        timeEntries: state.timeEntries.filter((e) => e.id !== action.entryId),
      };

    case "DELETE_COUNTER_EVENT":
      return {
        ...state,
        counterEvents: state.counterEvents.filter(
          (e) => e.id !== action.eventId,
        ),
      };

    case "DELETE_CHECK_EVENT":
      return {
        ...state,
        checkEvents: state.checkEvents.filter((e) => e.id !== action.eventId),
      };

    case "REPLACE_COUNTER_EVENT_ID":
      return {
        ...state,
        counterEvents: state.counterEvents.map((event) =>
          event.id === action.tempId ? { ...event, id: action.realId } : event,
        ),
      };

    case "REPLACE_CHECK_EVENT_ID":
      return {
        ...state,
        checkEvents: state.checkEvents.map((event) =>
          event.id === action.tempId ? { ...event, id: action.realId } : event,
        ),
      };

    case "REPLACE_TIME_ENTRY_ID":
      return {
        ...state,
        timeEntries: state.timeEntries.map((entry) =>
          entry.id === action.tempId ? { ...entry, id: action.realId } : entry,
        ),
      };

    // Timer (immediate, not batched)
    case "START_TIMER":
      return { ...state, activeTimer: action.entry };

    case "STOP_TIMER":
      if (!state.activeTimer) return state;
      const stoppedEntry = { ...state.activeTimer, ended_at: action.endedAt };
      return {
        ...state,
        activeTimer: null,
        timeEntries: [
          stoppedEntry,
          ...state.timeEntries.filter((e) => e.id !== stoppedEntry.id),
        ],
      };

    case "CLEAR_TIMER":
      return { ...state, activeTimer: null };

    // Sync queue
    case "QUEUE_MUTATION":
      return {
        ...state,
        pendingMutations: [...state.pendingMutations, action.mutation],
      };

    case "SET_PENDING_MUTATIONS": {
      const existing = new Map(state.pendingMutations.map((m) => [m.id, m]));
      for (const mutation of action.mutations) {
        existing.set(mutation.id, mutation);
      }
      return {
        ...state,
        pendingMutations: Array.from(existing.values()),
      };
    }

    case "MUTATION_SYNCED":
      return {
        ...state,
        pendingMutations: state.pendingMutations.filter(
          (m) => m.id !== action.mutationId,
        ),
        syncError: null,
      };

    case "MUTATION_FAILED":
      return {
        ...state,
        pendingMutations: state.pendingMutations.map((m) =>
          m.id === action.mutationId
            ? { ...m, status: "failed" as const, retries: m.retries + 1 }
            : m,
        ),
        syncError: action.error,
      };

    case "CLEAR_SYNC_ERROR":
      return { ...state, syncError: null };

    // Goal periods
    case "SET_GOAL_PERIODS":
      return { ...state, goalPeriods: action.periods };

    case "UPSERT_GOAL_PERIOD": {
      const key = `${action.period.goal_id}:${action.period.period_start}:${action.period.period_end}`;
      const exists = state.goalPeriods.some(
        (p) => `${p.goal_id}:${p.period_start}:${p.period_end}` === key,
      );
      if (exists) {
        return {
          ...state,
          goalPeriods: state.goalPeriods.map((p) =>
            `${p.goal_id}:${p.period_start}:${p.period_end}` === key
              ? action.period
              : p,
          ),
        };
      }
      return { ...state, goalPeriods: [...state.goalPeriods, action.period] };
    }

    default:
      return state;
  }
}

// =============================================================================
// CREATE STORE (vanilla, no React dependency)
// =============================================================================

export function createAppStore(): AppStore {
  let state = initialState;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const dispatch = (action: AppAction) => {
    state = reducer(state, action);
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { getState, dispatch, subscribe };
}
