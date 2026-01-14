"use client";

import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";
import type {
  AppStore,
  Context,
  Tag,
  CounterEvent,
  CheckEvent,
  TimeEntry,
} from "./types";
import { queueMutation } from "./sync";

// =============================================================================
// CONTEXT MUTATIONS
// =============================================================================

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function ensureContext(
  store: AppStore,
  name: string,
): Promise<{ context: Context | null; error: string | null }> {
  const normalized = normalizeName(name);
  if (!normalized) {
    return { context: null, error: "Context name is required." };
  }

  const state = store.getState();

  // Check if exists locally
  const existing = state.contexts.find(
    (c) => c.name.toLowerCase() === normalized.toLowerCase(),
  );
  if (existing) {
    return { context: existing, error: null };
  }

  // Create on server
  const { userId, error: userError } = await getCurrentUserId();
  if (userError || !userId) {
    return {
      context: null,
      error: userError ?? "Please log in to create a context.",
    };
  }

  const { data, error: insertError } = await supabase
    .from("contexts")
    .insert({ name: normalized, user_id: userId })
    .select("id, name")
    .single();

  if (insertError || !data) {
    // Try to find if it was created by race condition
    const { data: fallback } = await supabase
      .from("contexts")
      .select("id, name")
      .ilike("name", normalized)
      .maybeSingle();

    if (fallback) {
      store.dispatch({ type: "ADD_CONTEXT", context: fallback });
      return { context: fallback, error: null };
    }
    return {
      context: null,
      error: insertError?.message ?? "Failed to create context.",
    };
  }

  store.dispatch({ type: "ADD_CONTEXT", context: data });
  return { context: data, error: null };
}

export async function updateContext(
  store: AppStore,
  contextId: string,
  name: string,
): Promise<{ context: Context | null; error: string | null }> {
  const normalized = normalizeName(name);
  if (!normalized) {
    return { context: null, error: "Context name is required." };
  }

  const { data, error: updateError } = await supabase
    .from("contexts")
    .update({ name: normalized })
    .eq("id", contextId)
    .select("id, name")
    .single();

  if (updateError || !data) {
    return {
      context: null,
      error: updateError?.message ?? "Failed to update context.",
    };
  }

  store.dispatch({ type: "UPDATE_CONTEXT", contextId, name: normalized });
  return { context: data, error: null };
}

export async function deleteContext(
  store: AppStore,
  contextId: string,
): Promise<{ error: string | null }> {
  // 1. Delete dependencies (events), then goals, then context.
  const [timeEntryResult, counterResult, checkResult] = await Promise.all([
    supabase.from("time_entries").delete().eq("context_id", contextId),
    supabase.from("counter_events").delete().eq("context_id", contextId),
    supabase.from("check_events").delete().eq("context_id", contextId),
  ]);

  const eventError =
    timeEntryResult.error ?? counterResult.error ?? checkResult.error;
  if (eventError) return { error: eventError.message };

  const { error: goalsError } = await supabase
    .from("goals")
    .delete()
    .eq("context_id", contextId);
  if (goalsError) return { error: goalsError.message };

  const { error } = await supabase
    .from("contexts")
    .delete()
    .eq("id", contextId);
  if (error) return { error: error.message };

  store.dispatch({ type: "DELETE_CONTEXT", contextId });
  return { error: null };
}

// =============================================================================
// TAG MUTATIONS
// =============================================================================

export async function ensureTag(
  store: AppStore,
  name: string,
): Promise<{ tag: Tag | null; error: string | null }> {
  const normalized = normalizeName(name);
  if (!normalized) {
    return { tag: null, error: "Tag name is required." };
  }

  const state = store.getState();

  const existing = state.tags.find(
    (t) => t.name.toLowerCase() === normalized.toLowerCase(),
  );
  if (existing) {
    return { tag: existing, error: null };
  }

  const { userId, error: userError } = await getCurrentUserId();
  if (userError || !userId) {
    return { tag: null, error: userError ?? "Please log in to create a tag." };
  }

  const { data, error: insertError } = await supabase
    .from("tags")
    .insert({ name: normalized, user_id: userId })
    .select("id, name")
    .single();

  if (insertError || !data) {
    const { data: fallback } = await supabase
      .from("tags")
      .select("id, name")
      .ilike("name", normalized)
      .maybeSingle();

    if (fallback) {
      store.dispatch({ type: "ADD_TAG", tag: fallback });
      return { tag: fallback, error: null };
    }
    return {
      tag: null,
      error: insertError?.message ?? "Failed to create tag.",
    };
  }

  store.dispatch({ type: "ADD_TAG", tag: data });
  return { tag: data, error: null };
}

export async function updateTag(
  store: AppStore,
  tagId: string,
  name: string,
): Promise<{ tag: Tag | null; error: string | null }> {
  const normalized = normalizeName(name);
  if (!normalized) {
    return { tag: null, error: "Tag name is required." };
  }

  const { data, error: updateError } = await supabase
    .from("tags")
    .update({ name: normalized })
    .eq("id", tagId)
    .select("id, name")
    .single();

  if (updateError || !data) {
    return {
      tag: null,
      error: updateError?.message ?? "Failed to update tag.",
    };
  }

  store.dispatch({ type: "UPDATE_TAG", tagId, name: normalized });
  return { tag: data, error: null };
}

export async function deleteTag(
  store: AppStore,
  tagId: string,
): Promise<{ error: string | null }> {
  const [timeEntryResult, goalTagResult, counterResult, checkResult] =
    await Promise.all([
      supabase.from("time_entry_tags").delete().eq("tag_id", tagId),
      supabase.from("goal_tags").delete().eq("tag_id", tagId),
      supabase.from("counter_event_tags").delete().eq("tag_id", tagId),
      supabase.from("check_event_tags").delete().eq("tag_id", tagId),
    ]);

  const joinError =
    timeEntryResult.error ??
    goalTagResult.error ??
    counterResult.error ??
    checkResult.error;
  if (joinError) return { error: joinError.message };

  const { error: tagError } = await supabase
    .from("tags")
    .delete()
    .eq("id", tagId);
  if (tagError) return { error: tagError.message };

  store.dispatch({ type: "DELETE_TAG", tagId });
  return { error: null };
}

// =============================================================================
// EVENT MUTATIONS (optimistic + batched sync)
// =============================================================================

export function addCounterEvent(
  store: AppStore,
  goalId: string,
  contextId: string,
  delta: number,
  occurredAt?: string,
): void {
  const event: CounterEvent = {
    id: `counter-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    goal_id: goalId,
    context_id: contextId,
    occurred_at: occurredAt || new Date().toISOString(),
    value_delta: delta,
  };

  // Optimistic update
  store.dispatch({ type: "ADD_COUNTER_EVENT", event });

  // Queue for sync
  queueMutation(store, "ADD_COUNTER_EVENT", event);
}

export function addCheckEvent(
  store: AppStore,
  goalId: string,
  contextId: string,
  state: boolean,
  occurredAt?: string,
): void {
  const event: CheckEvent = {
    id: `check-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    goal_id: goalId,
    context_id: contextId,
    occurred_at: occurredAt || new Date().toISOString(),
    state,
  };

  // Optimistic update
  store.dispatch({ type: "ADD_CHECK_EVENT", event });

  // Queue for sync
  queueMutation(store, "ADD_CHECK_EVENT", event);
}

// =============================================================================
// GOAL MUTATIONS
// =============================================================================

export async function archiveGoal(
  store: AppStore,
  goalId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("goals")
    .update({ is_archived: true })
    .eq("id", goalId);

  if (error) return { error: error.message };

  store.dispatch({ type: "ARCHIVE_GOAL", goalId });
  return { error: null };
}

export async function updateGoal(
  store: AppStore,
  goalId: string,
  updates: { title?: string; end_date?: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", goalId);

  if (error) return { error: error.message };

  store.dispatch({ type: "UPDATE_GOAL", goalId, updates });
  return { error: null };
}

export async function updateGoalTags(
  store: AppStore,
  goalId: string,
  tagIds: string[],
): Promise<{ error: string | null }> {
  const state = store.getState();
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return { error: "Goal not found" };

  const currentTagIds = new Set(goal.tags.map((t) => t.id));
  const nextTagIds = new Set(tagIds);

  const toAdd = tagIds.filter((id) => !currentTagIds.has(id));
  const toRemove = [...currentTagIds].filter((id) => !nextTagIds.has(id));

  // Add new tags
  if (toAdd.length > 0) {
    const { error: addError } = await supabase
      .from("goal_tags")
      .insert(toAdd.map((tagId) => ({ goal_id: goalId, tag_id: tagId })));
    if (addError) return { error: addError.message };
  }

  // Remove old tags
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("goal_tags")
      .delete()
      .eq("goal_id", goalId)
      .in("tag_id", toRemove);
    if (removeError) return { error: removeError.message };
  }

  // Refetch contexts/tags for simplicity or update store manually
  // For now, let's just refetch the goal tags in the store dispatcher
  const updatedTags = state.tags.filter((t) => nextTagIds.has(t.id));
  store.dispatch({
    type: "UPDATE_GOAL",
    goalId,
    updates: { tags: updatedTags },
  });

  return { error: null };
}

// =============================================================================
// MANUAL EVENT MUTATIONS
// =============================================================================

export async function addManualTimeEntry(
  store: AppStore,
  goalId: string,
  contextId: string,
  startedAt: string,
  endedAt: string,
  tagIds: string[] = [],
): Promise<{ error: string | null }> {
  const state = store.getState();
  if (!state.userId) return { error: "Not authenticated" };

  const entry: TimeEntry = {
    id: `time-${Date.now()}`,
    goal_id: goalId,
    context_id: contextId,
    started_at: startedAt,
    ended_at: endedAt,
    tag_ids: tagIds,
  };

  // Optimistic
  store.dispatch({ type: "ADD_TIME_ENTRY", entry });

  // Sync
  queueMutation(store, "ADD_TIME_ENTRY", entry);

  return { error: null };
}

export async function deleteEvent(
  store: AppStore,
  type: "time" | "counter" | "check",
  id: string,
): Promise<{ error: string | null }> {
  const table =
    type === "time"
      ? "time_entries"
      : type === "counter"
        ? "counter_events"
        : "check_events";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: error.message };

  if (type === "time")
    store.dispatch({ type: "DELETE_TIME_ENTRY", entryId: id });
  if (type === "counter")
    store.dispatch({ type: "DELETE_COUNTER_EVENT", eventId: id });
  if (type === "check")
    store.dispatch({ type: "DELETE_CHECK_EVENT", eventId: id });

  return { error: null };
}
