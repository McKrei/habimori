"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import { getCurrentUserId } from "@/src/components/auth";
import {
  getPeriodRangeForDate,
  recalcGoalPeriods,
} from "@/src/components/goalPeriods";
import {
  formatMinutesAsHHMM,
  formatSecondsAsHHMMSS,
} from "@/src/components/formatters";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";

type GoalSummary = {
  id: string;
  title: string;
  goal_type: "time" | "counter" | "check";
  period: "day" | "week" | "month";
  target_value: number;
  target_op: "gte" | "lte";
  start_date: string;
  end_date: string;
  context_id: string;
  is_archived: boolean;
  context: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
};

type CheckStateMap = Record<string, boolean>;
type StatusMap = Record<
  string,
  { status: string; actual_value: number | null }
>;

function getTodayDateString() {
  const now = new Date();
  const localMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return localMidnight.toISOString().slice(0, 10);
}

export default function Home() {
  const { activeEntry, startTimer, stopTimer } = useActiveTimer();
  const { contexts } = useContexts();
  const { tags } = useTags();
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [checkStates, setCheckStates] = useState<CheckStateMap>({});
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingGoalId, setWorkingGoalId] = useState<string | null>(null);
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>(
    {},
  );
  const [selectedContext, setSelectedContext] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const activeGoalId = activeEntry?.goal_id ?? null;

  const loadGoals = async () => {
    setIsLoading(true);
    setError(null);

    const today = getTodayDateString();
    const { data, error: fetchError } = await supabase
      .from("goals")
      .select(
        "id, title, goal_type, period, target_value, target_op, start_date, end_date, context_id, is_archived, context:contexts(id, name), goal_tags(tag_id, tag:tags(id, name)), created_at",
      )
      .eq("is_active", true)
      .eq("is_archived", false)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const mappedGoals = (data ?? []).map((goal) => ({
      ...goal,
      tags: (goal.goal_tags ?? []).map(
        (item: { tag: { id: string; name: string } }) => item.tag,
      ),
    })) as GoalSummary[];
    setGoals(mappedGoals);

    const checkGoalIds = mappedGoals
      .filter((goal) => goal.goal_type === "check")
      .map((goal) => goal.id);

    if (checkGoalIds.length > 0) {
      const { data: checkEvents, error: checkError } = await supabase
        .from("check_events")
        .select("goal_id, state, occurred_at")
        .in("goal_id", checkGoalIds)
        .order("occurred_at", { ascending: false });

      if (!checkError && checkEvents) {
        const nextStates: CheckStateMap = {};
        for (const event of checkEvents) {
          if (event.goal_id && nextStates[event.goal_id] === undefined) {
            nextStates[event.goal_id] = Boolean(event.state);
          }
        }
        setCheckStates(nextStates);
      }
    }

    await loadStatuses(mappedGoals);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadGoals();
  }, []);

  useEffect(() => {
    if (!activeEntry?.started_at) return;
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeEntry?.started_at]);

  const loadStatuses = async (items: GoalSummary[]) => {
    if (items.length === 0) {
      setStatusMap({});
      return;
    }

    const buildFilters = (list: GoalSummary[]) =>
      list
        .map((goal) => {
          const { period_start, period_end } = getPeriodRangeForDate(
            goal.period,
            new Date(),
          );
          return `and(goal_id.eq.${goal.id},period_start.eq.${period_start},period_end.eq.${period_end})`;
        })
        .join(",");

    const fetchStatuses = async () => {
      const { data, error: statusError } = await supabase
        .from("goal_periods")
        .select("goal_id, status, actual_value")
        .or(buildFilters(items));

      if (statusError) {
        setStatusMap({});
        return { map: {}, missing: items.map((goal) => goal.id) };
      }

      const nextMap: StatusMap = {};
      for (const row of data ?? []) {
        if (row.goal_id) {
          nextMap[row.goal_id] = {
            status: row.status,
            actual_value: row.actual_value ?? null,
          };
        }
      }
      const missing = items
        .filter((goal) => !nextMap[goal.id])
        .map((goal) => goal.id);
      setStatusMap(nextMap);
      return { map: nextMap, missing };
    };

    const initial = await fetchStatuses();
    if (initial.missing.length > 0) {
      for (const id of initial.missing) {
        await recalcGoalPeriods(id);
      }
      await fetchStatuses();
    }
  };

  const handleCounterEvent = async (goal: GoalSummary, delta: number) => {
    if (delta <= 0 || !Number.isInteger(delta)) {
      setError("Counter value must be a positive integer.");
      return;
    }

    setWorkingGoalId(goal.id);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setWorkingGoalId(null);
      return;
    }
    if (!userId) {
      setError("Please log in to log counter events.");
      setWorkingGoalId(null);
      return;
    }
    const { error: insertError } = await supabase
      .from("counter_events")
      .insert({
        user_id: userId,
        goal_id: goal.id,
        context_id: goal.context_id,
        occurred_at: new Date().toISOString(),
        value_delta: delta,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      await recalcGoalPeriods(goal.id);
      await loadStatuses(goals);
    }

    setWorkingGoalId(null);
  };

  const handleCounterSubmit = async (goal: GoalSummary) => {
    const rawValue = counterInputs[goal.id]?.trim() ?? "";
    const parsed = rawValue === "" ? 1 : Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a positive integer.");
      return;
    }
    await handleCounterEvent(goal, parsed);
    setCounterInputs((prev) => ({ ...prev, [goal.id]: "" }));
  };

  const handleStartTimer = async (goal: GoalSummary) => {
    setWorkingGoalId(goal.id);
    setError(null);
    const { error: startError } = await startTimer({
      contextId: goal.context_id,
      goalId: goal.id,
    });
    if (startError) {
      setError(startError);
    }
    setWorkingGoalId(null);
  };

  const handleStopTimer = async () => {
    setWorkingGoalId(activeGoalId ?? "");
    setError(null);
    const { error: stopError } = await stopTimer();
    if (stopError) {
      setError(stopError);
    } else if (activeGoalId) {
      await recalcGoalPeriods(activeGoalId);
      await loadStatuses(goals);
    }
    setWorkingGoalId(null);
  };

  const handleCheckToggle = async (goal: GoalSummary, nextState: boolean) => {
    setWorkingGoalId(goal.id);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setWorkingGoalId(null);
      return;
    }
    if (!userId) {
      setError("Please log in to log check events.");
      setWorkingGoalId(null);
      return;
    }
    const { error: insertError } = await supabase.from("check_events").insert({
      user_id: userId,
      goal_id: goal.id,
      context_id: goal.context_id,
      occurred_at: new Date().toISOString(),
      state: nextState,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setCheckStates((prev) => ({ ...prev, [goal.id]: nextState }));
      await recalcGoalPeriods(goal.id);
      await loadStatuses(goals);
    }

    setWorkingGoalId(null);
  };

  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      const contextOk =
        selectedContext === "" || goal.context_id === selectedContext;
      const tagsOk =
        selectedTags.length === 0 ||
        goal.tags.some((tag) => selectedTags.includes(tag.id));
      const statusEntry = statusMap[goal.id];
      const statusOk =
        selectedStatus === "" ||
        (statusEntry ? selectedStatus === statusEntry.status : false);
      return contextOk && tagsOk && statusOk;
    });
  }, [goals, selectedContext, selectedTags, selectedStatus, statusMap]);

  const emptyState = useMemo(
    () => !isLoading && filteredGoals.length === 0,
    [filteredGoals, isLoading],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          href="/goals/new"
        >
          Add goal
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading goals…
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Filters</h2>
          <button
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
            type="button"
            onClick={() => {
              setSelectedContext("");
              setSelectedTags([]);
              setSelectedStatus("");
            }}
          >
            Reset
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Context
            <select
              className="ml-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              value={selectedContext}
              onChange={(event) => setSelectedContext(event.target.value)}
            >
              <option value="">All</option>
              {contexts.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.name}
                </option>
              ))}
            </select>
          </label>

          <div className="relative">
            <label className="text-xs font-semibold text-slate-500">Tags</label>
            <button
              className="ml-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              type="button"
              onClick={() => setIsTagsOpen((prev) => !prev)}
            >
              {selectedTags.length > 0
                ? `Selected (${selectedTags.length})`
                : "All"}
            </button>
            {isTagsOpen ? (
              <div className="absolute left-0 top-10 z-10 max-h-56 w-56 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                {tags.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-slate-500">No tags</p>
                ) : (
                  tags.map((tag) => {
                    const checked = selectedTags.includes(tag.id);
                    return (
                      <label
                        key={tag.id}
                        className="flex items-center gap-2 px-2 py-1 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedTags((prev) =>
                              checked
                                ? prev.filter((id) => id !== tag.id)
                                : [...prev, tag.id],
                            )
                          }
                        />
                        {tag.name}
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <label className="text-xs font-semibold text-slate-500">
            Status
            <select
              className="ml-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              <option value="">All</option>
              {["success", "fail", "in_progress", "archived"].map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {emptyState ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No active goals yet.</p>
          <Link
            className="mt-4 inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
            href="/goals/new"
          >
            Create your first goal
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4">
        {filteredGoals.map((goal) => {
          const contextLabel = goal.context?.name ?? "Unknown context";
          const isActiveTimer = activeGoalId === goal.id;
          const isTimerBlocked = Boolean(activeEntry) && !isActiveTimer;
          const isWorking = workingGoalId === goal.id;
          const checkState = checkStates[goal.id] ?? false;
          const statusEntry = statusMap[goal.id];
          const isPositive = goal.target_op === "gte";
          const borderColor =
            statusEntry?.status === "success"
              ? "border-emerald-400"
              : statusEntry?.status === "fail"
                ? "border-rose-400"
                : statusEntry?.status === "in_progress"
                  ? "border-amber-400"
                  : "border-slate-200";
          const accentColor = isPositive ? "text-emerald-500" : "text-rose-500";
          const actionBorder = isPositive
            ? "border-emerald-400 text-emerald-500"
            : "border-rose-400 text-rose-500";
          const actionText = isPositive ? "text-emerald-500" : "text-rose-500";
          const actualValue = statusEntry?.actual_value ?? 0;
          const displayValue =
            goal.goal_type === "time"
              ? formatMinutesAsHHMM(actualValue)
              : `${actualValue}`;
          const activeSeconds =
            isActiveTimer && activeEntry?.started_at
              ? (now.getTime() - new Date(activeEntry.started_at).getTime()) /
                1000
              : 0;

          return (
            <div
              key={goal.id}
              className={`rounded-2xl border-2 bg-white p-5 ${borderColor}`}
            >
              <div className="grid grid-cols-[1fr_1fr] items-center gap-3">
                <div className="min-w-0">
                  <Link
                    className="block truncate text-[clamp(1.15rem,2.4vw,1.6rem)] font-semibold text-slate-900 hover:text-slate-700"
                    href={`/goals/${goal.id}`}
                  >
                    {goal.title}
                  </Link>
                  <p className="truncate text-sm text-slate-600">
                    {goal.period} · {contextLabel}
                    {goal.tags.length > 0
                      ? ` · ${goal.tags.map((tag) => `#${tag.name}`).join(" ")}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-nowrap items-center justify-end gap-2">
                  {goal.goal_type === "counter" ? (
                    <>
                      <div className="text-xl font-semibold md:text-2xl">
                        <span className={accentColor}>{displayValue}</span>
                        <span className="text-slate-300"> / </span>
                        <span className="text-slate-900">
                          {goal.target_value}
                        </span>
                      </div>
                      <input
                        className={`w-12 rounded-md border px-2 py-1 text-sm md:w-16 ${actionBorder}`}
                        inputMode="numeric"
                        placeholder="1"
                        value={counterInputs[goal.id] ?? ""}
                        onChange={(event) =>
                          setCounterInputs((prev) => ({
                            ...prev,
                            [goal.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void handleCounterSubmit(goal);
                          }
                        }}
                      />
                      <button
                        className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                        type="button"
                        onClick={() => handleCounterSubmit(goal)}
                        disabled={isWorking}
                      >
                        +
                      </button>
                    </>
                  ) : null}

                  {goal.goal_type === "time" ? (
                    <>
                      <div
                        className={`text-xl font-semibold md:text-2xl ${accentColor}`}
                      >
                        {isActiveTimer
                          ? formatSecondsAsHHMMSS(activeSeconds)
                          : displayValue}
                      </div>
                      {isActiveTimer ? (
                        <button
                          className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                          type="button"
                          onClick={handleStopTimer}
                          disabled={isWorking}
                          title="Stop"
                        >
                          ⏸
                        </button>
                      ) : (
                        <button
                          className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                          type="button"
                          onClick={() => handleStartTimer(goal)}
                          disabled={isTimerBlocked || isWorking}
                          title={
                            isTimerBlocked ? "Another timer is running" : "Play"
                          }
                        >
                          ▶
                        </button>
                      )}
                    </>
                  ) : null}

                  {goal.goal_type === "check" ? (
                    <button
                      className={`h-9 w-9 rounded-lg border-2 ${actionBorder} bg-white text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                      type="button"
                      onClick={() => handleCheckToggle(goal, !checkState)}
                      disabled={isWorking}
                    >
                      <span className={actionText}>
                        {checkState ? "✓" : ""}
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
