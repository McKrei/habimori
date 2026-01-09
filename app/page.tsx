"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import ToastStack, { type Toast } from "@/src/components/ToastStack";

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
  const [optimisticDeltas, setOptimisticDeltas] = useState<
    Record<string, number>
  >({});
  const [optimisticStatus, setOptimisticStatus] = useState<
    Record<string, string>
  >({});
  const [pendingByGoal, setPendingByGoal] = useState<Record<string, boolean>>(
    {},
  );
  const [errorByGoal, setErrorByGoal] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>(
    {},
  );
  const [selectedContext, setSelectedContext] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const counterBatchRef = useRef<
    Record<string, { delta: number; timer: number | null; mutationId: number }>
  >({});
  const counterMutationRef = useRef<Record<string, number>>({});
  const checkMutationRef = useRef<Record<string, number>>({});
  const timeMutationRef = useRef<Record<string, number>>({});
  const recalcTimersRef = useRef<Record<string, number>>({});

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

  const pushToast = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const computeStatusForGoal = useCallback(
    (goal: GoalSummary, actualValue: number) => {
      const { end } = getPeriodRangeForDate(goal.period, new Date());
      const nowTime = new Date();
      if (goal.target_op === "gte") {
        if (actualValue >= goal.target_value) return "success";
        return nowTime < end ? "in_progress" : "fail";
      }
      if (actualValue > goal.target_value) return "fail";
      return nowTime < end ? "in_progress" : "success";
    },
    [],
  );

  const refreshStatus = useCallback(async (goal: GoalSummary) => {
    const { period_start, period_end } = getPeriodRangeForDate(
      goal.period,
      new Date(),
    );
    const { data, error: statusError } = await supabase
      .from("goal_periods")
      .select("goal_id, status, actual_value")
      .eq("goal_id", goal.id)
      .eq("period_start", period_start)
      .eq("period_end", period_end)
      .maybeSingle();

    if (statusError || !data?.goal_id) {
      return;
    }

    setStatusMap((prev) => ({
      ...prev,
      [goal.id]: {
        status: data.status,
        actual_value: data.actual_value ?? null,
      },
    }));
  }, []);

  const scheduleRecalc = useCallback(
    async (goal: GoalSummary) => {
      if (recalcTimersRef.current[goal.id]) {
        window.clearTimeout(recalcTimersRef.current[goal.id]);
      }
      recalcTimersRef.current[goal.id] = window.setTimeout(async () => {
        await recalcGoalPeriods(goal.id);
        await refreshStatus(goal);
      }, 1200);
    },
    [refreshStatus],
  );

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

  const handleCounterEvent = (goal: GoalSummary, delta: number) => {
    if (delta <= 0 || !Number.isInteger(delta)) {
      pushToast("Enter a positive integer.", "error");
      return;
    }

    const nextMutationId = (counterMutationRef.current[goal.id] ?? 0) + 1;
    counterMutationRef.current[goal.id] = nextMutationId;

    setPendingByGoal((prev) => ({ ...prev, [goal.id]: true }));
    setErrorByGoal((prev) => ({ ...prev, [goal.id]: false }));

    setOptimisticDeltas((prev) => {
      const nextDelta = (prev[goal.id] ?? 0) + delta;
      const baseActual = statusMap[goal.id]?.actual_value ?? 0;
      const nextActual = baseActual + nextDelta;
      setOptimisticStatus((statusPrev) => ({
        ...statusPrev,
        [goal.id]: computeStatusForGoal(goal, nextActual),
      }));
      return { ...prev, [goal.id]: nextDelta };
    });

    const existingBatch = counterBatchRef.current[goal.id];
    const batch = existingBatch ?? { delta: 0, timer: null, mutationId: 0 };
    batch.delta += delta;
    batch.mutationId = nextMutationId;
    if (batch.timer) {
      window.clearTimeout(batch.timer);
    }
    batch.timer = window.setTimeout(async () => {
      const current = counterBatchRef.current[goal.id];
      const batchDelta = current?.delta ?? 0;
      const mutationId = current?.mutationId ?? 0;
      counterBatchRef.current[goal.id] = {
        delta: 0,
        timer: null,
        mutationId: 0,
      };

      const { userId, error: userError } = await getCurrentUserId();
      if (userError || !userId) {
        if (counterMutationRef.current[goal.id] === mutationId) {
          setOptimisticDeltas((prev) => ({ ...prev, [goal.id]: 0 }));
          setOptimisticStatus((prev) => {
            const next = { ...prev };
            delete next[goal.id];
            return next;
          });
          setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
          setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
          pushToast(
            userError ?? "Please log in to log counter events.",
            "error",
          );
        }
        return;
      }

      const { error: insertError } = await supabase
        .from("counter_events")
        .insert({
          user_id: userId,
          goal_id: goal.id,
          context_id: goal.context_id,
          occurred_at: new Date().toISOString(),
          value_delta: batchDelta,
        });

      if (counterMutationRef.current[goal.id] !== mutationId) {
        return;
      }

      if (insertError) {
        setOptimisticDeltas((prev) => ({ ...prev, [goal.id]: 0 }));
        setOptimisticStatus((prev) => {
          const next = { ...prev };
          delete next[goal.id];
          return next;
        });
        setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
        setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
        pushToast(insertError.message, "error");
        return;
      }

      setStatusMap((prev) => {
        const base = prev[goal.id]?.actual_value ?? 0;
        return {
          ...prev,
          [goal.id]: {
            status: prev[goal.id]?.status ?? "in_progress",
            actual_value: base + batchDelta,
          },
        };
      });
      setOptimisticDeltas((prev) => ({ ...prev, [goal.id]: 0 }));
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[goal.id];
        return next;
      });
      setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
      scheduleRecalc(goal);
    }, 500);
    counterBatchRef.current[goal.id] = batch;
  };

  const handleCounterSubmit = (goal: GoalSummary) => {
    const rawValue = counterInputs[goal.id]?.trim() ?? "";
    const parsed = rawValue === "" ? 1 : Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      pushToast("Enter a positive integer.", "error");
      return;
    }
    handleCounterEvent(goal, parsed);
    setCounterInputs((prev) => ({ ...prev, [goal.id]: "" }));
  };

  const handleStartTimer = (goal: GoalSummary) => {
    const mutationId = (timeMutationRef.current[goal.id] ?? 0) + 1;
    timeMutationRef.current[goal.id] = mutationId;
    setPendingByGoal((prev) => ({ ...prev, [goal.id]: true }));
    setErrorByGoal((prev) => ({ ...prev, [goal.id]: false }));

    void startTimer({
      contextId: goal.context_id,
      goalId: goal.id,
    }).then(({ error: startError }) => {
      if (timeMutationRef.current[goal.id] !== mutationId) return;
      if (startError) {
        setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
        pushToast(startError, "error");
      } else {
        scheduleRecalc(goal);
      }
      setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
    });
  };

  const handleStopTimer = (goal: GoalSummary) => {
    const mutationId = (timeMutationRef.current[goal.id] ?? 0) + 1;
    timeMutationRef.current[goal.id] = mutationId;
    setPendingByGoal((prev) => ({ ...prev, [goal.id]: true }));
    setErrorByGoal((prev) => ({ ...prev, [goal.id]: false }));

    void stopTimer().then(({ error: stopError }) => {
      if (timeMutationRef.current[goal.id] !== mutationId) return;
      if (stopError) {
        setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
        pushToast(stopError, "error");
      } else {
        scheduleRecalc(goal);
      }
      setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
    });
  };

  const handleCheckToggle = (goal: GoalSummary, nextState: boolean) => {
    const mutationId = (checkMutationRef.current[goal.id] ?? 0) + 1;
    checkMutationRef.current[goal.id] = mutationId;
    const previousState = checkStates[goal.id] ?? false;

    setPendingByGoal((prev) => ({ ...prev, [goal.id]: true }));
    setErrorByGoal((prev) => ({ ...prev, [goal.id]: false }));
    setCheckStates((prev) => ({ ...prev, [goal.id]: nextState }));
    setOptimisticStatus((prev) => ({
      ...prev,
      [goal.id]: computeStatusForGoal(goal, nextState ? 1 : 0),
    }));

    void (async () => {
      const { userId, error: userError } = await getCurrentUserId();
      if (userError || !userId) {
        if (checkMutationRef.current[goal.id] === mutationId) {
          setCheckStates((prev) => ({ ...prev, [goal.id]: previousState }));
          setOptimisticStatus((prev) => {
            const next = { ...prev };
            delete next[goal.id];
            return next;
          });
          setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
          setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
          pushToast(userError ?? "Please log in to log check events.", "error");
        }
        return;
      }

      const { error: insertError } = await supabase
        .from("check_events")
        .insert({
          user_id: userId,
          goal_id: goal.id,
          context_id: goal.context_id,
          occurred_at: new Date().toISOString(),
          state: nextState,
        });

      if (checkMutationRef.current[goal.id] !== mutationId) return;

      if (insertError) {
        setCheckStates((prev) => ({ ...prev, [goal.id]: previousState }));
        setOptimisticStatus((prev) => {
          const next = { ...prev };
          delete next[goal.id];
          return next;
        });
        setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
        setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
        pushToast(insertError.message, "error");
        return;
      }

      setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[goal.id];
        return next;
      });
      scheduleRecalc(goal);
    })();
  };

  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      const contextOk =
        selectedContext === "" || goal.context_id === selectedContext;
      const tagsOk =
        selectedTags.length === 0 ||
        goal.tags.some((tag) => selectedTags.includes(tag.id));
      const statusEntry = statusMap[goal.id];
      const effectiveStatus = optimisticStatus[goal.id] ?? statusEntry?.status;
      const statusOk =
        selectedStatus === "" ||
        (effectiveStatus ? selectedStatus === effectiveStatus : false);
      return contextOk && tagsOk && statusOk;
    });
  }, [
    goals,
    optimisticStatus,
    selectedContext,
    selectedTags,
    selectedStatus,
    statusMap,
  ]);

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
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-500">
            <span className="sr-only">Context</span>
            <select
              className="h-9 w-44 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
              value={selectedContext}
              onChange={(event) => setSelectedContext(event.target.value)}
            >
              <option value="">Context</option>
              {contexts.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500">
            <span className="sr-only">Status</span>
            <select
              className="h-9 w-44 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              <option value="">Status</option>
              {["success", "fail", "in_progress", "archived"].map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <div className="relative">
            <button
              className="h-9 w-42 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
              type="button"
              onClick={() => setIsTagsOpen((prev) => !prev)}
            >
              {selectedTags.length > 0
                ? `Selected (${selectedTags.length})`
                : "Tags"}
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

          <button
            className="ml-auto h-9 rounded-md bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
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
          const checkState = checkStates[goal.id] ?? false;
          const statusEntry = statusMap[goal.id];
          const optimisticDelta = optimisticDeltas[goal.id] ?? 0;
          const effectiveStatus =
            optimisticStatus[goal.id] ?? statusEntry?.status;
          const baseActual = statusEntry?.actual_value ?? 0;
          const effectiveActual =
            goal.goal_type === "counter"
              ? baseActual + optimisticDelta
              : baseActual;
          const isPending = pendingByGoal[goal.id] ?? false;
          const hasError = errorByGoal[goal.id] ?? false;
          const isPositive = goal.target_op === "gte";
          const borderColor =
            effectiveStatus === "success"
              ? "border-emerald-400"
              : effectiveStatus === "fail"
                ? "border-rose-400"
                : effectiveStatus === "in_progress"
                  ? "border-amber-400"
                  : "border-slate-200";
          const accentColor = isPositive ? "text-emerald-500" : "text-rose-500";
          const actionBorder = isPositive
            ? "border-emerald-400 text-emerald-500"
            : "border-rose-400 text-rose-500";
          const actionText = isPositive ? "text-emerald-500" : "text-rose-500";
          const actualValue = effectiveActual;
          const displayValue =
            goal.goal_type === "time"
              ? formatMinutesAsHHMM(actualValue)
              : `${actualValue}`;
          const activeSeconds =
            isActiveTimer && activeEntry?.started_at
              ? (now.getTime() - new Date(activeEntry.started_at).getTime()) /
                1000
              : 0;
          const totalSeconds =
            goal.goal_type === "time" ? actualValue * 60 + activeSeconds : 0;

          return (
            <div
              key={goal.id}
              className={`relative rounded-2xl border-2 bg-white p-5 ${borderColor}`}
            >
              {hasError ? (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
              ) : isPending ? (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-amber-400" />
              ) : null}
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
                          ? formatSecondsAsHHMMSS(totalSeconds)
                          : displayValue}
                      </div>
                      {isActiveTimer ? (
                        <button
                          className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                          type="button"
                          onClick={() => handleStopTimer(goal)}
                          title="Stop"
                        >
                          ⏸
                        </button>
                      ) : (
                        <button
                          className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                          type="button"
                          onClick={() => handleStartTimer(goal)}
                          disabled={isTimerBlocked}
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

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
