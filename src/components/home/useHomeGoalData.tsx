"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import { getCurrentUserId } from "@/src/components/auth";
import { useTranslation } from "@/src/i18n/TranslationContext";
import {
  getPeriodRangeForDate,
  recalcGoalPeriods,
} from "@/src/components/goalPeriods";
import type { Toast } from "@/src/components/ToastStack";
import type { CheckStateMap, GoalSummary, StatusMap } from "./types";
import { getDateString } from "./utils";

type RawGoal = Omit<GoalSummary, "context" | "tags"> & {
  context: { id: string; name: string } | { id: string; name: string }[] | null;
  goal_tags?: {
    tag: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];
};

export function useHomeGoalData(selectedDate: Date) {
  const { activeEntry, startTimer, stopTimer } = useActiveTimer();
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [checkStates, setCheckStates] = useState<CheckStateMap>({});
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [optimisticDeltas, setOptimisticDeltas] = useState<
    Record<string, number>
  >({});
  const [optimisticStatus, setOptimisticStatus] = useState<
    Record<string, string>
  >({});
  const [activeBaseSeconds, setActiveBaseSeconds] = useState<
    Record<string, number>
  >({});
  const [timeOverrides, setTimeOverrides] = useState<
    Record<string, number | null>
  >({});
  const [timeSecondsMap, setTimeSecondsMap] = useState<Record<string, number>>(
    {},
  );
  const [pendingByGoal, setPendingByGoal] = useState<Record<string, boolean>>(
    {},
  );
  const [errorByGoal, setErrorByGoal] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>(
    {},
  );
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setActiveBaseSeconds({});
      setTimeOverrides({});
      setTimeSecondsMap({});
      setOptimisticDeltas({});
      setOptimisticStatus({});
      setPendingByGoal({});
      setErrorByGoal({});
      setStatusMap({});
      setCounterInputs({});
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [selectedDate]);

  const computeStatusForGoal = useCallback(
    (goal: GoalSummary, actualValue: number) => {
      const { end } = getPeriodRangeForDate(goal.period, selectedDate);
      const nowTime = selectedDate;
      if (goal.target_op === "gte") {
        if (actualValue >= goal.target_value) return "success";
        return nowTime < end ? "in_progress" : "fail";
      }
      if (actualValue > goal.target_value) return "fail";
      return nowTime < end ? "in_progress" : "success";
    },
    [selectedDate],
  );

  const loadTimeSeconds = useCallback(
    async (items: GoalSummary[]) => {
      const timeGoals = items.filter((goal) => goal.goal_type === "time");
      if (timeGoals.length === 0) {
        setTimeSecondsMap({});
        return;
      }

      const results = await Promise.all(
        timeGoals.map(async (goal) => {
          const { start, end } = getPeriodRangeForDate(
            goal.period,
            selectedDate,
          );
          const { data, error: timeError } = await supabase
            .from("time_entries")
            .select("started_at, ended_at")
            .eq("goal_id", goal.id)
            .lt("started_at", end.toISOString())
            .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`);

          if (timeError || !data) {
            return [goal.id, 0] as const;
          }

          let totalMs = 0;
          for (const entry of data) {
            if (!entry.ended_at) {
              continue;
            }
            const startedAt = new Date(entry.started_at);
            const endedAt = entry.ended_at
              ? new Date(entry.ended_at)
              : new Date();
            const overlapStart = startedAt > start ? startedAt : start;
            const overlapEnd = endedAt < end ? endedAt : end;
            if (overlapEnd > overlapStart) {
              totalMs += overlapEnd.getTime() - overlapStart.getTime();
            }
          }

          return [goal.id, Math.ceil(totalMs / 1000)] as const;
        }),
      );

      const nextMap: Record<string, number> = {};
      for (const [goalId, seconds] of results) {
        nextMap[goalId] = seconds;
      }
      setTimeSecondsMap((prev) => {
        const merged = { ...prev };
        for (const [goalId, seconds] of Object.entries(nextMap)) {
          merged[goalId] = Math.max(prev[goalId] ?? 0, seconds);
        }
        return merged;
      });
    },
    [selectedDate],
  );

  const loadStatuses = useCallback(
    async (items: GoalSummary[]) => {
      if (items.length === 0) {
        setStatusMap({});
        return;
      }

      const buildFilters = (list: GoalSummary[]) =>
        list
          .map((goal) => {
            const { period_start, period_end } = getPeriodRangeForDate(
              goal.period,
              selectedDate,
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
    },
    [selectedDate],
  );

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const dayKey = getDateString(selectedDate);
    const { data, error: fetchError } = await supabase
      .from("goals")
      .select(
        "id, title, goal_type, period, target_value, target_op, start_date, end_date, context_id, is_archived, context:contexts(id, name), goal_tags(tag_id, tag:tags(id, name)), created_at",
      )
      .eq("is_active", true)
      .eq("is_archived", false)
      .lte("start_date", dayKey)
      .gte("end_date", dayKey)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const mappedGoals: GoalSummary[] = (data ?? []).map((goal: RawGoal) => {
      const context = Array.isArray(goal.context)
        ? (goal.context[0] ?? null)
        : (goal.context ?? null);
      const tags =
        goal.goal_tags
          ?.map((item) =>
            Array.isArray(item.tag)
              ? (item.tag[0] ?? null)
              : (item.tag ?? null),
          )
          .filter((tag): tag is { id: string; name: string } => tag !== null) ??
        [];

      return {
        ...goal,
        context,
        tags,
      };
    });
    setGoals(mappedGoals);

    const checkGoals = mappedGoals.filter((goal) => goal.goal_type === "check");
    const checkGoalIds = checkGoals.map((goal) => goal.id);

    if (checkGoalIds.length > 0) {
      const ranges = new Map<string, { start: Date; end: Date }>();
      let minStart = null as Date | null;
      let maxEnd = null as Date | null;
      for (const goal of checkGoals) {
        const { start, end } = getPeriodRangeForDate(goal.period, selectedDate);
        ranges.set(goal.id, { start, end });
        minStart = minStart ? (start < minStart ? start : minStart) : start;
        maxEnd = maxEnd ? (end > maxEnd ? end : maxEnd) : end;
      }
      const { data: checkEvents, error: checkError } = await supabase
        .from("check_events")
        .select("goal_id, state, occurred_at")
        .in("goal_id", checkGoalIds)
        .gte("occurred_at", (minStart ?? selectedDate).toISOString())
        .lt("occurred_at", (maxEnd ?? selectedDate).toISOString())
        .order("occurred_at", { ascending: false });

      if (!checkError && checkEvents) {
        const nextStates: CheckStateMap = {};
        const assigned = new Set<string>();
        for (const goal of checkGoals) {
          nextStates[goal.id] = false;
        }
        for (const event of checkEvents) {
          if (!event.goal_id || assigned.has(event.goal_id)) continue;
          const range = ranges.get(event.goal_id);
          if (!range) continue;
          const occurredAt = new Date(event.occurred_at);
          if (occurredAt < range.start || occurredAt >= range.end) continue;
          nextStates[event.goal_id] = Boolean(event.state);
          assigned.add(event.goal_id);
        }
        setCheckStates(nextStates);
      }
    } else {
      setCheckStates({});
    }

    await loadStatuses(mappedGoals);
    await loadTimeSeconds(mappedGoals);
    setIsLoading(false);
  }, [loadStatuses, loadTimeSeconds, selectedDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadGoals();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeEntry?.goal_id, loadGoals, selectedDate]);

  useEffect(() => {
    if (goals.length === 0) return;
    const timeout = window.setTimeout(() => {
      void loadTimeSeconds(goals);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeEntry?.goal_id, goals, loadTimeSeconds, selectedDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!activeEntry?.goal_id || typeof activeEntry.goal_id !== "string") {
        setActiveBaseSeconds({});
        return;
      }
      const goalId = activeEntry.goal_id;
      setActiveBaseSeconds((prev) => ({
        ...prev,
        [goalId]: timeSecondsMap[goalId] ?? 0,
      }));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeEntry?.goal_id, timeSecondsMap]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!activeEntry?.goal_id || typeof activeEntry.goal_id !== "string") {
        return;
      }
      const goalId = activeEntry.goal_id;
      const nextBase = timeSecondsMap[goalId] ?? 0;
      if (nextBase === 0) return;
      setActiveBaseSeconds((prev) => {
        const currentBase = prev[goalId] ?? 0;
        if (nextBase <= currentBase) {
          return prev;
        }
        return { ...prev, [goalId]: nextBase };
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeEntry?.goal_id, timeSecondsMap]);

  useEffect(() => {
    if (!activeEntry?.started_at) return;
    const timeout = window.setTimeout(() => {
      setNow(new Date());
    }, 0);
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 500);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [activeEntry?.started_at]);

  const refreshTimeSeconds = useCallback(
    async (goal: GoalSummary, overrideValue?: number) => {
      if (goal.goal_type !== "time") return;
      if (activeEntry?.goal_id === goal.id) return;
      const { start, end } = getPeriodRangeForDate(goal.period, selectedDate);
      const { data, error: timeError } = await supabase
        .from("time_entries")
        .select("started_at, ended_at")
        .eq("goal_id", goal.id)
        .lt("started_at", end.toISOString())
        .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`);

      if (timeError || !data) {
        return;
      }

      let totalMs = 0;
      for (const entry of data) {
        if (!entry.ended_at) {
          continue;
        }
        const startedAt = new Date(entry.started_at);
        const endedAt = entry.ended_at ? new Date(entry.ended_at) : new Date();
        const overlapStart = startedAt > start ? startedAt : start;
        const overlapEnd = endedAt < end ? endedAt : end;
        if (overlapEnd > overlapStart) {
          totalMs += overlapEnd.getTime() - overlapStart.getTime();
        }
      }

      const nextSeconds = Math.max(
        timeSecondsMap[goal.id] ?? 0,
        Math.ceil(totalMs / 1000),
      );
      setTimeSecondsMap((prev) => ({
        ...prev,
        [goal.id]: Math.max(prev[goal.id] ?? 0, nextSeconds),
      }));
      if (overrideValue !== undefined) {
        setTimeOverrides((prev) => {
          const current = prev[goal.id];
          if (current == null) return prev;
          if (nextSeconds >= current) {
            const next = { ...prev };
            next[goal.id] = null;
            return next;
          }
          return prev;
        });
      }
    },
    [activeEntry?.goal_id, selectedDate, timeSecondsMap],
  );

  const refreshStatus = useCallback(
    async (goal: GoalSummary) => {
      const { period_start, period_end } = getPeriodRangeForDate(
        goal.period,
        selectedDate,
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
      setOptimisticStatus((prev) => {
        const optimistic = prev[goal.id];
        if (!optimistic) return prev;
        if (optimistic !== data.status) {
          return prev;
        }
        const next = { ...prev };
        delete next[goal.id];
        return next;
      });
    },
    [selectedDate],
  );

  const scheduleRecalc = useCallback(
    async (goal: GoalSummary) => {
      if (recalcTimersRef.current[goal.id]) {
        window.clearTimeout(recalcTimersRef.current[goal.id]);
      }
      recalcTimersRef.current[goal.id] = window.setTimeout(async () => {
        await recalcGoalPeriods(goal.id);
        await refreshStatus(goal);
        await refreshTimeSeconds(goal);
      }, 1200);
    },
    [refreshStatus, refreshTimeSeconds],
  );

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
      tagIds: goal.tags.map((tag) => tag.id),
    }).then(({ error: startError }) => {
      if (timeMutationRef.current[goal.id] !== mutationId) return;
      if (startError) {
        setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorMessage: string = typeof startError === 'string' ? startError : t(startError.key as any, startError.params);
        pushToast(errorMessage, "error");
        if (typeof startError === 'object' && startError.key === 'errors.timerAlreadyRunning') {
          window.location.href = window.location.href;
        }
      } else {
        scheduleRecalc(goal);
      }
      setPendingByGoal((prev) => ({ ...prev, [goal.id]: false }));
    });
  };

  const handleStopTimer = (goal: GoalSummary) => {
    const mutationId = (timeMutationRef.current[goal.id] ?? 0) + 1;
    timeMutationRef.current[goal.id] = mutationId;
    const endedAt = new Date().toISOString();
    if (activeEntry?.goal_id === goal.id && activeEntry.started_at) {
      const elapsedSeconds = Math.max(
        0,
        Math.ceil(
          (new Date(endedAt).getTime() -
            new Date(activeEntry.started_at).getTime()) /
            1000,
        ),
      );
      const baseSeconds =
        activeBaseSeconds[goal.id] ?? timeSecondsMap[goal.id] ?? 0;
      setTimeOverrides((prev) => ({
        ...prev,
        [goal.id]: baseSeconds + elapsedSeconds,
      }));
    }
    setPendingByGoal((prev) => ({ ...prev, [goal.id]: true }));
    setErrorByGoal((prev) => ({ ...prev, [goal.id]: false }));

    void stopTimer(endedAt).then(({ error: stopError }) => {
      if (timeMutationRef.current[goal.id] !== mutationId) return;
      if (stopError) {
        setErrorByGoal((prev) => ({ ...prev, [goal.id]: true }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorMessage: string = typeof stopError === 'string' ? stopError : t(stopError.key as any, stopError.params);
        pushToast(errorMessage, "error");
        if (typeof stopError === 'object' && stopError.key === 'errors.timerAlreadyStopped') {
          window.location.href = window.location.href;
        }
      } else {
        void refreshTimeSeconds(goal, timeOverrides[goal.id] ?? undefined);
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
      scheduleRecalc(goal);
    })();
  };

  const setCounterInput = useCallback((goalId: string, value: string) => {
    setCounterInputs((prev) => ({ ...prev, [goalId]: value }));
  }, []);

  return {
    activeEntry,
    activeBaseSeconds,
    checkStates,
    counterInputs,
    dismissToast,
    error,
    errorByGoal,
    goals,
    handleCheckToggle,
    handleCounterSubmit,
    handleStartTimer,
    handleStopTimer,
    isLoading,
    now,
    optimisticDeltas,
    optimisticStatus,
    pendingByGoal,
    setCounterInput,
    statusMap,
    timeOverrides,
    timeSecondsMap,
    toasts,
    activeGoalId,
  };
}
