"use client";

import { supabase } from "@/lib/supabase/client";
import type {
  AppStore,
  PendingMutation,
  CounterEvent,
  CheckEvent,
  TimeEntry,
} from "./types";

// =============================================================================
// SYNC CONFIG
// =============================================================================

const SYNC_DEBOUNCE_MS = 2000;
const MAX_RETRIES = 3;
const STORAGE_KEY = "habimori-pending-mutations";

// =============================================================================
// SYNC MANAGER
// =============================================================================

let syncTimeout: number | null = null;
let isSyncing = false;

function readStoredMutations(): PendingMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as PendingMutation[];
  } catch {
    return [];
  }
}

function persistPendingMutations(store: AppStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(store.getState().pendingMutations),
    );
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Initialize sync manager with store reference
 */
export function initSync(store: AppStore): void {
  const stored = readStoredMutations();
  if (stored.length > 0) {
    store.dispatch({ type: "SET_PENDING_MUTATIONS", mutations: stored });
    void syncPendingMutations(store);
  }
}

/**
 * Queue a mutation and schedule debounced sync
 */
export function queueMutation(
  store: AppStore,
  type: PendingMutation["type"],
  payload: unknown,
): void {
  const mutation: PendingMutation = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    createdAt: Date.now(),
    status: "pending",
    retries: 0,
  };

  store.dispatch({ type: "QUEUE_MUTATION", mutation });
  persistPendingMutations(store);
  scheduleSyncDebounced(store);
}

function scheduleSyncDebounced(store: AppStore): void {
  if (syncTimeout) {
    window.clearTimeout(syncTimeout);
  }
  syncTimeout = window.setTimeout(() => {
    syncTimeout = null;
    void syncPendingMutations(store);
  }, SYNC_DEBOUNCE_MS);
}

// =============================================================================
// SYNC TO SERVER
// =============================================================================

async function syncPendingMutations(store: AppStore): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const state = store.getState();
    const pendingMutations = state.pendingMutations.filter(
      (m) => m.status === "pending" && m.retries < MAX_RETRIES,
    );

    if (pendingMutations.length === 0) return;

    for (const mutation of pendingMutations) {
      try {
        await syncSingleMutation(store, mutation, state.userId);
        store.dispatch({ type: "MUTATION_SYNCED", mutationId: mutation.id });
        persistPendingMutations(store);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        store.dispatch({
          type: "MUTATION_FAILED",
          mutationId: mutation.id,
          error: message,
        });
        persistPendingMutations(store);
      }
    }
  } finally {
    isSyncing = false;
  }
}

async function syncSingleMutation(
  store: AppStore,
  mutation: PendingMutation,
  userId: string | null,
): Promise<void> {
  if (!userId) throw new Error("Not authenticated");

  switch (mutation.type) {
    case "ADD_COUNTER_EVENT": {
      const event = mutation.payload as CounterEvent;
      const { data, error } = await supabase
        .from("counter_events")
        .insert({
          user_id: userId,
          goal_id: event.goal_id,
          context_id: event.context_id,
          occurred_at: event.occurred_at,
          value_delta: event.value_delta,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (data?.id && data.id !== event.id) {
        store.dispatch({
          type: "REPLACE_COUNTER_EVENT_ID",
          tempId: event.id,
          realId: data.id,
        });
      }
      break;
    }

    case "ADD_CHECK_EVENT": {
      const event = mutation.payload as CheckEvent;
      const { data, error } = await supabase
        .from("check_events")
        .insert({
          user_id: userId,
          goal_id: event.goal_id,
          context_id: event.context_id,
          occurred_at: event.occurred_at,
          state: event.state,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (data?.id && data.id !== event.id) {
        store.dispatch({
          type: "REPLACE_CHECK_EVENT_ID",
          tempId: event.id,
          realId: data.id,
        });
      }
      break;
    }

    case "ADD_TIME_ENTRY": {
      const entry = mutation.payload as TimeEntry;
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          goal_id: entry.goal_id,
          context_id: entry.context_id,
          started_at: entry.started_at,
          ended_at: entry.ended_at,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (data?.id && data.id !== entry.id) {
        store.dispatch({
          type: "REPLACE_TIME_ENTRY_ID",
          tempId: entry.id,
          realId: data.id,
        });
      }

      // Insert tags
      if (data?.id && entry.tag_ids.length > 0) {
        const tagInserts = entry.tag_ids.map((tagId) => ({
          time_entry_id: data.id,
          tag_id: tagId,
        }));
        await supabase.from("time_entry_tags").insert(tagInserts);
      }
      break;
    }

    case "UPDATE_TIME_ENTRY": {
      const { entryId, updates } = mutation.payload as {
        entryId: string;
        updates: Partial<TimeEntry>;
      };
      const { error } = await supabase
        .from("time_entries")
        .update({
          started_at: updates.started_at,
          ended_at: updates.ended_at,
        })
        .eq("id", entryId);
      if (error) throw new Error(error.message);
      break;
    }

    case "DELETE_TIME_ENTRY": {
      const { entryId } = mutation.payload as { entryId: string };
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw new Error(error.message);
      break;
    }

    default:
      // Other mutations handled directly (not batched)
      break;
  }
}

// =============================================================================
// IMMEDIATE WRITES (Timer operations)
// =============================================================================

/**
 * Start timer - immediate write, not batched
 */
export async function startTimerImmediate(
  store: AppStore,
  contextId: string,
  goalId: string | null,
  tagIds: string[],
): Promise<{ error?: string; entryId?: string }> {
  const state = store.getState();
  if (!state.userId) return { error: "Not authenticated" };
  if (state.activeTimer) return { error: "Timer already running" };

  const optimisticId = `timer-${Date.now()}`;
  const startedAt = new Date().toISOString();

  // Optimistic update
  const optimisticEntry: TimeEntry = {
    id: optimisticId,
    goal_id: goalId,
    context_id: contextId,
    started_at: startedAt,
    ended_at: null,
    tag_ids: tagIds,
  };
  store.dispatch({ type: "START_TIMER", entry: optimisticEntry });

  // Immediate server write
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: state.userId,
      context_id: contextId,
      goal_id: goalId,
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Rollback
    store.dispatch({ type: "CLEAR_TIMER" });
    return { error: error?.message ?? "Failed to start timer" };
  }

  // Update with real ID
  const realEntry: TimeEntry = {
    ...optimisticEntry,
    id: data.id,
  };
  store.dispatch({ type: "START_TIMER", entry: realEntry });

  // Insert tags
  if (tagIds.length > 0) {
    const tagInserts = tagIds.map((tagId) => ({
      time_entry_id: data.id,
      tag_id: tagId,
    }));
    await supabase.from("time_entry_tags").insert(tagInserts);
  }

  return { entryId: data.id };
}

/**
 * Stop timer - immediate write, not batched
 */
export async function stopTimerImmediate(
  store: AppStore,
  endedAt?: string,
): Promise<{ error?: string }> {
  const state = store.getState();
  const activeTimer = state.activeTimer;

  if (!activeTimer) return { error: "No active timer" };
  if (!state.userId) return { error: "Not authenticated" };

  const finalEndedAt = endedAt ?? new Date().toISOString();

  // Optimistic update
  store.dispatch({ type: "STOP_TIMER", endedAt: finalEndedAt });

  // Skip if optimistic ID (not yet synced)
  if (activeTimer.id.startsWith("timer-")) {
    return {};
  }

  // Immediate server write
  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at: finalEndedAt })
    .eq("id", activeTimer.id);

  if (error) {
    // Rollback - restore timer
    store.dispatch({ type: "START_TIMER", entry: activeTimer });
    return { error: error.message };
  }

  return {};
}
