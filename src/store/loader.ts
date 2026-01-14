"use client";

import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";
import type {
  AppStore,
  Goal,
  Context,
  Tag,
  TimeEntry,
  CounterEvent,
  CheckEvent,
  GoalPeriodRecord,
} from "./types";

// =============================================================================
// DATA WINDOW
// =============================================================================

const DAYS_BACK = 60;
const DAYS_FORWARD = 7;

function getDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - DAYS_BACK);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(end.getDate() + DAYS_FORWARD);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// =============================================================================
// LOADERS
// =============================================================================

async function loadGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select(
      "id, title, goal_type, period, target_value, target_op, start_date, end_date, context_id, is_active, is_archived, created_at, context:contexts(id, name), goal_tags(tag_id, tag:tags(id, name))",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const ctx = Array.isArray(row.context)
      ? (row.context[0] ?? null)
      : (row.context ?? null);
    const tags =
      row.goal_tags
        ?.map(
          (gt: {
            tag:
              | { id: string; name: string }
              | { id: string; name: string }[]
              | null;
          }) =>
            Array.isArray(gt.tag) ? (gt.tag[0] ?? null) : (gt.tag ?? null),
        )
        .filter((t): t is { id: string; name: string } => t !== null) ?? [];

    return {
      id: row.id,
      title: row.title,
      goal_type: row.goal_type as Goal["goal_type"],
      period: row.period as Goal["period"],
      target_value: row.target_value,
      target_op: row.target_op as Goal["target_op"],
      start_date: row.start_date,
      end_date: row.end_date,
      context_id: row.context_id,
      is_active: row.is_active,
      is_archived: row.is_archived,
      created_at: row.created_at,
      context: ctx,
      tags,
    };
  });
}

async function loadContexts(): Promise<Context[]> {
  const { data, error } = await supabase
    .from("contexts")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadTimeEntries(start: Date, end: Date): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      "id, goal_id, context_id, started_at, ended_at, time_entry_tags(tag_id)",
    )
    .lt("started_at", end.toISOString())
    .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`)
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    goal_id: row.goal_id ?? null,
    context_id: row.context_id,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    tag_ids:
      row.time_entry_tags?.map((t: { tag_id: string }) => t.tag_id) ?? [],
  }));
}

async function loadCounterEvents(
  start: Date,
  end: Date,
): Promise<CounterEvent[]> {
  const { data, error } = await supabase
    .from("counter_events")
    .select("id, goal_id, context_id, occurred_at, value_delta")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    goal_id: row.goal_id ?? null,
    context_id: row.context_id,
    occurred_at: row.occurred_at,
    value_delta: row.value_delta,
  }));
}

async function loadCheckEvents(start: Date, end: Date): Promise<CheckEvent[]> {
  const { data, error } = await supabase
    .from("check_events")
    .select("id, goal_id, context_id, occurred_at, state")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    goal_id: row.goal_id ?? null,
    context_id: row.context_id,
    occurred_at: row.occurred_at,
    state: row.state,
  }));
}

async function loadGoalPeriods(
  start: Date,
  end: Date,
): Promise<GoalPeriodRecord[]> {
  const { data, error } = await supabase
    .from("goal_periods")
    .select(
      "goal_id, period_start, period_end, actual_value, status, calculated_at",
    )
    .gte("period_start", toISODate(start))
    .lte("period_start", toISODate(end));

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    goal_id: row.goal_id,
    period_start: row.period_start,
    period_end: row.period_end,
    actual_value: row.actual_value,
    status: row.status as GoalPeriodRecord["status"],
    calculated_at: row.calculated_at,
  }));
}

async function loadActiveTimer(): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      "id, goal_id, context_id, started_at, ended_at, time_entry_tags(tag_id)",
    )
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    goal_id: data.goal_id ?? null,
    context_id: data.context_id,
    started_at: data.started_at,
    ended_at: null,
    tag_ids:
      data.time_entry_tags?.map((t: { tag_id: string }) => t.tag_id) ?? [],
  };
}

// =============================================================================
// INITIALIZE
// =============================================================================

export async function initializeStore(store: AppStore): Promise<void> {
  store.dispatch({ type: "INIT_START" });

  try {
    const { userId, error: userError } = await getCurrentUserId();
    if (userError || !userId) {
      // Not logged in yet - not an error
      store.dispatch({ type: "INIT_ERROR", error: "" });
      return;
    }

    const { start, end } = getDateRange();

    // Parallel fetch all data
    const [
      goals,
      contexts,
      tags,
      timeEntries,
      counterEvents,
      checkEvents,
      goalPeriods,
      activeTimer,
    ] = await Promise.all([
      loadGoals(),
      loadContexts(),
      loadTags(),
      loadTimeEntries(start, end),
      loadCounterEvents(start, end),
      loadCheckEvents(start, end),
      loadGoalPeriods(start, end),
      loadActiveTimer(),
    ]);

    const pending = store.getState().pendingMutations;
    const pendingCounterEvents = pending
      .filter((m) => m.type === "ADD_COUNTER_EVENT")
      .map((m) => m.payload as CounterEvent);
    const pendingCheckEvents = pending
      .filter((m) => m.type === "ADD_CHECK_EVENT")
      .map((m) => m.payload as CheckEvent);
    const pendingTimeEntries = pending
      .filter((m) => m.type === "ADD_TIME_ENTRY")
      .map((m) => m.payload as TimeEntry);

    const mergeById = <T extends { id: string }>(items: T[], extra: T[]) => {
      const seen = new Set(items.map((item) => item.id));
      const merged = [...items];
      for (const item of extra) {
        if (!seen.has(item.id)) {
          merged.push(item);
        }
      }
      return merged;
    };

    const dedupePendingCounters = (
      items: CounterEvent[],
      extra: CounterEvent[],
    ) => {
      const signatures = new Set(
        items.map(
          (event) =>
            `${event.goal_id ?? ""}|${event.context_id}|${event.occurred_at}|${event.value_delta}`,
        ),
      );
      return extra.filter(
        (event) =>
          !signatures.has(
            `${event.goal_id ?? ""}|${event.context_id}|${event.occurred_at}|${event.value_delta}`,
          ),
      );
    };

    const dedupePendingChecks = (items: CheckEvent[], extra: CheckEvent[]) => {
      const signatures = new Set(
        items.map(
          (event) =>
            `${event.goal_id ?? ""}|${event.context_id}|${event.occurred_at}|${event.state ? 1 : 0}`,
        ),
      );
      return extra.filter(
        (event) =>
          !signatures.has(
            `${event.goal_id ?? ""}|${event.context_id}|${event.occurred_at}|${event.state ? 1 : 0}`,
          ),
      );
    };

    const dedupePendingTimeEntries = (
      items: TimeEntry[],
      extra: TimeEntry[],
    ) => {
      const signatures = new Set(
        items.map(
          (entry) =>
            `${entry.goal_id ?? ""}|${entry.context_id}|${entry.started_at}|${entry.ended_at ?? ""}`,
        ),
      );
      return extra.filter(
        (entry) =>
          !signatures.has(
            `${entry.goal_id ?? ""}|${entry.context_id}|${entry.started_at}|${entry.ended_at ?? ""}`,
          ),
      );
    };

    store.dispatch({
      type: "INIT_SUCCESS",
      payload: {
        userId,
        goals,
        contexts,
        tags,
        timeEntries: mergeById(
          timeEntries,
          dedupePendingTimeEntries(timeEntries, pendingTimeEntries),
        ),
        counterEvents: mergeById(
          counterEvents,
          dedupePendingCounters(counterEvents, pendingCounterEvents),
        ),
        checkEvents: mergeById(
          checkEvents,
          dedupePendingChecks(checkEvents, pendingCheckEvents),
        ),
        goalPeriods,
        activeTimer,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load data";
    store.dispatch({ type: "INIT_ERROR", error: message });
  }
}
