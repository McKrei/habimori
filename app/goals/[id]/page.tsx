"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";
import { useParams } from "next/navigation";
import {
  formatDate,
  formatDateTime,
  formatDurationMinutes,
  formatGoalTarget,
} from "@/src/components/formatters";

type GoalDetails = {
  id: string;
  title: string;
  goal_type: "time" | "counter" | "check";
  period: "day" | "week" | "month";
  target_value: number;
  target_op: "gte" | "lte";
  start_date: string;
  end_date: string;
  context_id: string;
  context: { id: string; name: string } | null;
};

type TimeEntry = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

type CounterEvent = {
  id: string;
  occurred_at: string;
  value_delta: number;
};

type CheckEvent = {
  id: string;
  occurred_at: string;
  state: boolean;
};

type ProgressSummary = {
  label: string;
  value: number;
};

function getPeriodBounds(period: GoalDetails["period"]) {
  const now = new Date();
  if (period === "day") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === "week") {
    const day = now.getDay();
    const diff = (day + 6) % 7;
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - diff,
    );
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function formatLocalInputDateTime(value: Date) {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function calculateTimeMinutes(entries: TimeEntry[], start: Date, end: Date) {
  let totalMinutes = 0;
  for (const entry of entries) {
    const started = new Date(entry.started_at);
    const ended = entry.ended_at ? new Date(entry.ended_at) : new Date();
    const overlapStart = started > start ? started : start;
    const overlapEnd = ended < end ? ended : end;
    if (overlapEnd > overlapStart) {
      totalMinutes += (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
    }
  }
  return Math.round(totalMinutes);
}

export default function GoalDetailsPage() {
  const params = useParams();
  const goalId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [goal, setGoal] = useState<GoalDetails | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [counterEvents, setCounterEvents] = useState<CounterEvent[]>([]);
  const [checkEvents, setCheckEvents] = useState<CheckEvent[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeStart, setTimeStart] = useState(
    formatLocalInputDateTime(new Date()),
  );
  const [timeEnd, setTimeEnd] = useState(formatLocalInputDateTime(new Date()));
  const [counterDelta, setCounterDelta] = useState("1");
  const [counterOccurredAt, setCounterOccurredAt] = useState(
    formatLocalInputDateTime(new Date()),
  );
  const [checkOccurredAt, setCheckOccurredAt] = useState(
    formatLocalInputDateTime(new Date()),
  );
  const [checkState, setCheckState] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGoal = async () => {
    if (!goalId || typeof goalId !== "string") {
      setError("Invalid goal id.");
      setGoal(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("goals")
      .select(
        "id, title, goal_type, period, target_value, target_op, start_date, end_date, context_id, context:contexts(id, name)",
      )
      .eq("id", goalId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setGoal(null);
      setIsLoading(false);
      return;
    }

    setGoal(data as GoalDetails);
    setIsLoading(false);
  };

  const loadEvents = async (goalData: GoalDetails) => {
    const [time, counter, check] = await Promise.all([
      goalData.goal_type === "time"
        ? supabase
            .from("time_entries")
            .select("id, started_at, ended_at")
            .eq("goal_id", goalData.id)
            .order("started_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      goalData.goal_type === "counter"
        ? supabase
            .from("counter_events")
            .select("id, occurred_at, value_delta")
            .eq("goal_id", goalData.id)
            .order("occurred_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      goalData.goal_type === "check"
        ? supabase
            .from("check_events")
            .select("id, occurred_at, state")
            .eq("goal_id", goalData.id)
            .order("occurred_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (time.error || counter.error || check.error) {
      setError(
        time.error?.message ||
          counter.error?.message ||
          check.error?.message ||
          null,
      );
      return;
    }

    setTimeEntries((time.data as TimeEntry[]) ?? []);
    setCounterEvents((counter.data as CounterEvent[]) ?? []);
    setCheckEvents((check.data as CheckEvent[]) ?? []);
  };

  const loadProgress = async (goalData: GoalDetails) => {
    const { start, end } = getPeriodBounds(goalData.period);
    if (goalData.goal_type === "time") {
      const { data, error: timeError } = await supabase
        .from("time_entries")
        .select("id, started_at, ended_at")
        .eq("goal_id", goalData.id)
        .lt("started_at", end.toISOString())
        .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`);

      if (timeError) {
        setProgress(null);
        return;
      }

      const minutes = calculateTimeMinutes(
        (data ?? []) as TimeEntry[],
        start,
        end,
      );
      setProgress({ label: "Minutes this period", value: minutes });
      return;
    }

    if (goalData.goal_type === "counter") {
      const { data, error: counterError } = await supabase
        .from("counter_events")
        .select("value_delta, occurred_at")
        .eq("goal_id", goalData.id)
        .gte("occurred_at", start.toISOString())
        .lt("occurred_at", end.toISOString());

      if (counterError) {
        setProgress(null);
        return;
      }

      const total = (data ?? []).reduce(
        (sum, event) => sum + (event.value_delta ?? 0),
        0,
      );
      setProgress({ label: "Count this period", value: total });
      return;
    }

    if (goalData.goal_type === "check") {
      const { data, error: checkError } = await supabase
        .from("check_events")
        .select("state, occurred_at")
        .eq("goal_id", goalData.id)
        .gte("occurred_at", start.toISOString())
        .lt("occurred_at", end.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(1);

      if (checkError) {
        setProgress(null);
        return;
      }

      const state = data?.[0]?.state ? 1 : 0;
      setProgress({ label: "Check state", value: state });
    }
  };

  useEffect(() => {
    void loadGoal();
  }, [goalId]);

  useEffect(() => {
    if (!goal) return;
    void loadEvents(goal);
    void loadProgress(goal);
  }, [goal]);

  const handleAddTimeEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goal) return;

    const start = new Date(timeStart);
    const end = new Date(timeEnd);
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setIsSubmitting(false);
      return;
    }
    if (!userId) {
      setError("Please log in to add events.");
      setIsSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("time_entries").insert({
      user_id: userId,
      goal_id: goal.id,
      context_id: goal.context_id,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      await loadEvents(goal);
      await loadProgress(goal);
    }

    setIsSubmitting(false);
  };

  const handleAddCounterEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goal) return;

    const delta = Number.parseInt(counterDelta, 10);
    if (!Number.isFinite(delta) || delta <= 0) {
      setError("Delta must be a positive integer.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setIsSubmitting(false);
      return;
    }
    if (!userId) {
      setError("Please log in to add events.");
      setIsSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase
      .from("counter_events")
      .insert({
        user_id: userId,
        goal_id: goal.id,
        context_id: goal.context_id,
        occurred_at: new Date(counterOccurredAt).toISOString(),
        value_delta: delta,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      await loadEvents(goal);
      await loadProgress(goal);
    }

    setIsSubmitting(false);
  };

  const handleAddCheckEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goal) return;

    setIsSubmitting(true);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setIsSubmitting(false);
      return;
    }
    if (!userId) {
      setError("Please log in to add events.");
      setIsSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("check_events").insert({
      user_id: userId,
      goal_id: goal.id,
      context_id: goal.context_id,
      occurred_at: new Date(checkOccurredAt).toISOString(),
      state: checkState,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      await loadEvents(goal);
      await loadProgress(goal);
    }

    setIsSubmitting(false);
  };

  const progressValue = useMemo(() => {
    if (!goal || !progress) return "—";
    if (goal.goal_type === "time") {
      return `${progress.value} / ${goal.target_value} min`;
    }
    if (goal.goal_type === "counter") {
      return `${progress.value} / ${goal.target_value}`;
    }
    return progress.value ? "Done" : "Not done";
  }, [goal, progress]);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading goal…
        </div>
      </section>
    );
  }

  if (!goal) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error ?? "Goal not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{goal.title}</h1>
          <p className="text-sm text-slate-600">
            {goal.goal_type} · {goal.period} · {formatGoalTarget(goal)}
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(goal.start_date)} → {formatDate(goal.end_date)} ·{" "}
            {goal.context?.name ?? "Unknown context"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          Progress: {progressValue}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Events</h2>

            {goal.goal_type === "time" ? (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {timeEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">No time entries yet.</p>
                ) : (
                  timeEntries.map((entry) => {
                    const started = formatDateTime(entry.started_at);
                    const ended = entry.ended_at
                      ? formatDateTime(entry.ended_at)
                      : "Running";
                    const minutes = calculateTimeMinutes(
                      [entry],
                      new Date(0),
                      new Date(),
                    );
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between"
                      >
                        <span>
                          {started} → {ended}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDurationMinutes(minutes)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {goal.goal_type === "counter" ? (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {counterEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No counter events yet.
                  </p>
                ) : (
                  counterEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between"
                    >
                      <span>{formatDateTime(event.occurred_at)}</span>
                      <span className="text-xs text-slate-500">
                        +{event.value_delta}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {goal.goal_type === "check" ? (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {checkEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">No check events yet.</p>
                ) : (
                  checkEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between"
                    >
                      <span>{formatDateTime(event.occurred_at)}</span>
                      <span className="text-xs text-slate-500">
                        {event.state ? "Done" : "Not done"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {goal.goal_type === "time" ? (
            <form
              className="rounded-lg border border-slate-200 bg-white p-5"
              onSubmit={handleAddTimeEntry}
            >
              <h2 className="text-base font-semibold">Add time entry</h2>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Start
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={timeStart}
                  onChange={(event) => setTimeStart(event.target.value)}
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                End
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={timeEnd}
                  onChange={(event) => setTimeEnd(event.target.value)}
                />
              </label>
              <button
                className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isSubmitting}
              >
                Add entry
              </button>
            </form>
          ) : null}

          {goal.goal_type === "counter" ? (
            <form
              className="rounded-lg border border-slate-200 bg-white p-5"
              onSubmit={handleAddCounterEvent}
            >
              <h2 className="text-base font-semibold">Add counter event</h2>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Occurred at
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={counterOccurredAt}
                  onChange={(event) => setCounterOccurredAt(event.target.value)}
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Delta
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={counterDelta}
                  onChange={(event) => setCounterDelta(event.target.value)}
                />
              </label>
              <button
                className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isSubmitting}
              >
                Add event
              </button>
            </form>
          ) : null}

          {goal.goal_type === "check" ? (
            <form
              className="rounded-lg border border-slate-200 bg-white p-5"
              onSubmit={handleAddCheckEvent}
            >
              <h2 className="text-base font-semibold">Add check event</h2>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Occurred at
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={checkOccurredAt}
                  onChange={(event) => setCheckOccurredAt(event.target.value)}
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                State
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={checkState ? "done" : "not"}
                  onChange={(event) =>
                    setCheckState(event.target.value === "done")
                  }
                >
                  <option value="done">Done</option>
                  <option value="not">Not done</option>
                </select>
              </label>
              <button
                className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isSubmitting}
              >
                Add event
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
