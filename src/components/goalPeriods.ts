"use client";

import { supabase } from "@/lib/supabase/client";

type GoalRecord = {
  id: string;
  goal_type: "time" | "counter" | "check";
  period: "day" | "week" | "month";
  target_value: number;
  target_op: "gte" | "lte";
  start_date: string;
  end_date: string;
  is_archived: boolean;
};

type TimeEntryRecord = {
  started_at: string;
  ended_at: string | null;
};

type CounterEventRecord = {
  occurred_at: string;
  value_delta: number;
};

type CheckEventRecord = {
  occurred_at: string;
  state: boolean;
};

type PeriodRange = {
  period_start: string;
  period_end: string;
  start: Date;
  end: Date;
};

const MS_IN_MINUTE = 60000;

function toISODate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getPeriodRangeForDate(
  period: GoalRecord["period"],
  date: Date,
) {
  const dayStart = startOfDay(date);

  if (period === "day") {
    const start = dayStart;
    const end = addDays(start, 1);
    return {
      period_start: toISODate(start),
      period_end: toISODate(addDays(start, 0)),
      start,
      end,
    };
  }

  if (period === "week") {
    const day = dayStart.getDay();
    const diff = (day + 6) % 7;
    const start = addDays(dayStart, -diff);
    const end = addDays(start, 7);
    return {
      period_start: toISODate(start),
      period_end: toISODate(addDays(start, 6)),
      start,
      end,
    };
  }

  const start = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
  const end = new Date(dayStart.getFullYear(), dayStart.getMonth() + 1, 1);
  const periodEnd = addDays(end, -1);
  return {
    period_start: toISODate(start),
    period_end: toISODate(periodEnd),
    start,
    end,
  };
}

function listPeriodRanges(
  period: GoalRecord["period"],
  startDate: string,
  endDate: string,
) {
  const start = startOfDay(new Date(`${startDate}T00:00:00`));
  const end = startOfDay(new Date(`${endDate}T00:00:00`));
  const ranges: PeriodRange[] = [];

  let cursor = start;
  while (cursor <= end) {
    const range = getPeriodRangeForDate(period, cursor);
    ranges.push(range);
    cursor =
      period === "day"
        ? addDays(cursor, 1)
        : period === "week"
          ? addDays(cursor, 7)
          : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return ranges;
}

function computeStatus(goal: GoalRecord, actualValue: number, periodEnd: Date) {
  if (goal.is_archived) {
    return "archived";
  }

  const now = new Date();
  if (goal.target_op === "gte") {
    if (actualValue >= goal.target_value) {
      return "success";
    }
    return now < periodEnd ? "in_progress" : "fail";
  }

  if (actualValue > goal.target_value) {
    return "fail";
  }

  return now < periodEnd ? "in_progress" : "success";
}

function calculateTimeMinutes(
  entries: TimeEntryRecord[],
  start: Date,
  end: Date,
) {
  let total = 0;
  for (const entry of entries) {
    const startedAt = new Date(entry.started_at);
    const endedAt = entry.ended_at ? new Date(entry.ended_at) : new Date();
    const overlapStart = startedAt > start ? startedAt : start;
    const overlapEnd = endedAt < end ? endedAt : end;
    if (overlapEnd > overlapStart) {
      total += (overlapEnd.getTime() - overlapStart.getTime()) / MS_IN_MINUTE;
    }
  }
  return Math.round(total);
}

export async function recalcGoalPeriods(goalId: string) {
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select(
      "id, goal_type, period, target_value, target_op, start_date, end_date, is_archived",
    )
    .eq("id", goalId)
    .single();

  if (goalError || !goal) {
    return { error: goalError?.message ?? "Goal not found." };
  }

  const ranges = listPeriodRanges(goal.period, goal.start_date, goal.end_date);
  const periodStart = ranges[0]?.start ?? new Date();
  const periodEnd = addDays(ranges[ranges.length - 1]?.end ?? new Date(), 0);

  const [timeEntries, counterEvents, checkEvents] = await Promise.all([
    goal.goal_type === "time"
      ? supabase
          .from("time_entries")
          .select("started_at, ended_at")
          .eq("goal_id", goal.id)
          .lt("started_at", periodEnd.toISOString())
          .or(`ended_at.is.null,ended_at.gte.${periodStart.toISOString()}`)
      : Promise.resolve({ data: [] as TimeEntryRecord[], error: null }),
    goal.goal_type === "counter"
      ? supabase
          .from("counter_events")
          .select("occurred_at, value_delta")
          .eq("goal_id", goal.id)
          .gte("occurred_at", periodStart.toISOString())
          .lt("occurred_at", periodEnd.toISOString())
      : Promise.resolve({ data: [] as CounterEventRecord[], error: null }),
    goal.goal_type === "check"
      ? supabase
          .from("check_events")
          .select("occurred_at, state")
          .eq("goal_id", goal.id)
          .gte("occurred_at", periodStart.toISOString())
          .lt("occurred_at", periodEnd.toISOString())
      : Promise.resolve({ data: [] as CheckEventRecord[], error: null }),
  ]);

  if (timeEntries.error || counterEvents.error || checkEvents.error) {
    return {
      error:
        timeEntries.error?.message ||
        counterEvents.error?.message ||
        checkEvents.error?.message ||
        "Failed to load events.",
    };
  }

  const timeData = (timeEntries.data ?? []) as TimeEntryRecord[];
  const counterData = (counterEvents.data ?? []) as CounterEventRecord[];
  const checkData = (checkEvents.data ?? []) as CheckEventRecord[];

  const rows = ranges.map((range) => {
    let actualValue = 0;

    if (goal.goal_type === "time") {
      actualValue = calculateTimeMinutes(timeData, range.start, range.end);
    }

    if (goal.goal_type === "counter") {
      actualValue = counterData
        .filter((event) => {
          const occurredAt = new Date(event.occurred_at);
          return occurredAt >= range.start && occurredAt < range.end;
        })
        .reduce((sum, event) => sum + event.value_delta, 0);
    }

    if (goal.goal_type === "check") {
      const latest = checkData
        .filter((event) => {
          const occurredAt = new Date(event.occurred_at);
          return occurredAt >= range.start && occurredAt < range.end;
        })
        .sort(
          (a, b) =>
            new Date(b.occurred_at).getTime() -
            new Date(a.occurred_at).getTime(),
        )[0];
      actualValue = latest?.state ? 1 : 0;
    }

    const status = computeStatus(goal, actualValue, range.end);

    return {
      goal_id: goal.id,
      period_start: range.period_start,
      period_end: range.period_end,
      actual_value: actualValue,
      status,
      calculated_at: new Date().toISOString(),
    };
  });

  const { error: upsertError } = await supabase
    .from("goal_periods")
    .upsert(rows, {
      onConflict: "goal_id,period_start,period_end",
    });

  if (upsertError) {
    return { error: upsertError.message };
  }

  return { error: null };
}
