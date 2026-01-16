"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Toast } from "@/src/components/ToastStack";
import type { GoalSummary, StatusMap } from "./types";
import { requestNotificationPermission } from "@/src/components/notifications";
import {
  useAppStore,
  useGoalsForDate,
  useGoalStatusMap,
  useTimeSecondsMap,
  useCheckStatesMap,
  useActiveTimer,
  addCounterEvent,
  addCheckEvent,
  startTimerImmediate,
  stopTimerImmediate,
} from "@/src/store";

export function useHomeGoalData(selectedDate: Date) {
  const store = useAppStore();
  const pomodoroSettingsStorageKey = "pomodoro:settings";

  // -- Store Data --
  const { goals: rawGoals, isLoading } = useGoalsForDate(selectedDate);
  const statusMapRaw = useGoalStatusMap(rawGoals, selectedDate);
  const timeSecondsMapRaw = useTimeSecondsMap(rawGoals, selectedDate);
  const checkStates = useCheckStatesMap(rawGoals, selectedDate);
  const { activeTimer } = useActiveTimer();

  // -- Local State --
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>(
    {},
  );
  const [now, setNow] = useState(() => new Date());

  // -- Effects --

  // Timer tick setup
  useEffect(() => {
    if (!activeTimer) return;

    // Tick every second
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // -- Computed Properties --

  // 1. Goals with mapped structure (for UI compatibility)
  const goals: GoalSummary[] = useMemo(() => {
    return rawGoals.map((g) => ({
      id: g.id,
      title: g.title,
      goal_type: g.goal_type,
      period: g.period,
      target_value: g.target_value,
      target_op: g.target_op,
      start_date: g.start_date,
      end_date: g.end_date,
      context_id: g.context_id,
      is_archived: g.is_archived,
      context: g.context,
      tags: g.tags,
    }));
  }, [rawGoals]);

  // 2. Status Map (mapped for UI compatibility)
  const statusMap: StatusMap = useMemo(() => {
    const map: StatusMap = {};
    for (const [id, val] of Object.entries(statusMapRaw)) {
      map[id] = {
        status: val.status,
        actual_value: val.actual_value,
      };
    }
    return map;
  }, [statusMapRaw]);

  // 3. Time Seconds Map (adding active timer duration)
  const timeSecondsMap = useMemo(
    () => ({ ...timeSecondsMapRaw }),
    [timeSecondsMapRaw],
  );

  // 4. Mapped check states (already compatible)
  // checkStates is Record<string, boolean> match CheckStateMap

  // -- Handlers --

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

  const handleStartTimer = async (goal: GoalSummary) => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(pomodoroSettingsStorageKey);
        const parsed = raw
          ? (JSON.parse(raw) as {
              enabled?: boolean;
              notificationsEnabled?: boolean;
            })
          : null;
        if (parsed?.enabled && parsed?.notificationsEnabled) {
          void requestNotificationPermission();
        }
      } catch {
        // Ignore storage errors.
      }
    }
    const result = await startTimerImmediate(
      store,
      goal.context_id,
      goal.id,
      goal.tags.map((t) => t.id),
    );

    if (result.error) {
      // Extract translation key and params if it's an object/known error style, or use string
      // Just fallback to string for now or basic error
      pushToast(result.error, "error");
    }
  };

  const handleStopTimer = async (_goal: GoalSummary) => {
    const result = await stopTimerImmediate(store);
    if (result.error) {
      pushToast(result.error, "error");
    }
  };

  const handleCounterSubmit = (goal: GoalSummary) => {
    const rawValue = counterInputs[goal.id]?.trim() ?? "";
    const parsed = rawValue === "" ? 1 : Number.parseInt(rawValue, 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      pushToast("Enter a positive integer.", "error");
      return;
    }

    addCounterEvent(store, goal.id, goal.context_id, parsed);
    setCounterInputs((prev) => ({ ...prev, [goal.id]: "" }));
  };

  const handleCheckToggle = (goal: GoalSummary, nextState: boolean) => {
    addCheckEvent(store, goal.id, goal.context_id, nextState);
  };

  const setCounterInput = useCallback((goalId: string, value: string) => {
    setCounterInputs((prev) => ({ ...prev, [goalId]: value }));
  }, []);

  // -- Return Interface matching original --
  return {
    activeEntry: activeTimer,
    activeBaseSeconds: {} as Record<string, number>, // Legacy, not used with new setup (calculated in timeSecondsMap)
    checkStates,
    counterInputs,
    dismissToast,
    error: null, // Store handles errors internally mostly
    errorByGoal: {} as Record<string, boolean>, // Deprecated fine-grained error state
    goals,
    handleCheckToggle,
    handleCounterSubmit,
    handleStartTimer,
    handleStopTimer,
    isLoading,
    now,
    optimisticDeltas: {} as Record<string, number>, // Deprecated, handled by store
    optimisticStatus: {} as Record<string, string>, // Deprecated, handled by store selector
    pendingByGoal: {} as Record<string, boolean>, // Could be computed from mutation status if needed
    setCounterInput,
    statusMap,
    timeOverrides: {} as Record<string, number | null>, // Deprecated
    timeSecondsMap,
    toasts,
    activeGoalId: activeTimer?.goal_id ?? null,
  };
}
