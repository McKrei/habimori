"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  getPeriodRangeForDate,
  recalcGoalPeriods,
} from "@/src/components/goalPeriods";
import { getDateString } from "@/src/components/home/utils";

type GoalRow = {
  id: string;
  period: "day" | "week" | "month";
  start_date: string;
  end_date: string;
};

type PeriodRow = {
  goal_id: string;
  status: "success" | "fail" | "in_progress" | "archived";
  period_start: string;
  period_end: string;
};

export type DayStatusPresence = {
  success: boolean;
  in_progress: boolean;
  fail: boolean;
};

type DayStatusMap = Record<string, DayStatusPresence>;

const EMPTY_STATUS: DayStatusPresence = {
  success: false,
  in_progress: false,
  fail: false,
};

export function useDayStatusMap(days: Date[]) {
  const [statusMap, setStatusMap] = useState<DayStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dayKeys = useMemo(() => days.map((day) => getDateString(day)), [days]);
  const dayKeySignature = useMemo(() => dayKeys.join("|"), [dayKeys]);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (days.length === 0) {
        setStatusMap({});
        setIsLoading(false);
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      void (async () => {
        setIsLoading(true);
        setError(null);

        let minKey = dayKeys[0] ?? "";
        let maxKey = dayKeys[0] ?? "";
        for (const key of dayKeys) {
          if (key < minKey) minKey = key;
          if (key > maxKey) maxKey = key;
        }
        const { data: goals, error: goalsError } = await supabase
          .from("goals")
          .select("id, period, start_date, end_date")
          .eq("is_active", true)
          .eq("is_archived", false)
          .lte("start_date", maxKey)
          .gte("end_date", minKey);

        if (goalsError) {
          setError(goalsError.message);
          setStatusMap({});
          setIsLoading(false);
          inFlightRef.current = false;
          return;
        }

        const goalRows = (goals ?? []) as GoalRow[];
        const dayToPeriodKeys: Record<string, Set<string>> = {};
        const periodMeta = new Map<
          string,
          { goal_id: string; period_start: string; period_end: string }
        >();

        for (const dayKey of dayKeys) {
          dayToPeriodKeys[dayKey] = new Set();
        }

        for (const goal of goalRows) {
          for (const day of days) {
            const dayKey = getDateString(day);
            if (dayKey < goal.start_date || dayKey > goal.end_date) {
              continue;
            }
            const range = getPeriodRangeForDate(goal.period, day);
            const periodKey = `${goal.id}:${range.period_start}:${range.period_end}`;
            dayToPeriodKeys[dayKey].add(periodKey);
            if (!periodMeta.has(periodKey)) {
              periodMeta.set(periodKey, {
                goal_id: goal.id,
                period_start: range.period_start,
                period_end: range.period_end,
              });
            }
          }
        }

        if (periodMeta.size === 0) {
          setStatusMap({});
          setIsLoading(false);
          inFlightRef.current = false;
          return;
        }

        const filters = [...periodMeta.values()].map(
          (item) =>
            `and(goal_id.eq.${item.goal_id},period_start.eq.${item.period_start},period_end.eq.${item.period_end})`,
        );

        const fetchPeriods = async () => {
          const { data, error: periodsError } = await supabase
            .from("goal_periods")
            .select("goal_id, status, period_start, period_end")
            .or(filters.join(","));
          if (periodsError) {
            setError(periodsError.message);
            inFlightRef.current = false;
            return [];
          }
          return (data ?? []) as PeriodRow[];
        };

        let periodRows = await fetchPeriods();
        const loadedKeys = new Set(
          periodRows.map(
            (row) => `${row.goal_id}:${row.period_start}:${row.period_end}`,
          ),
        );
        const missingGoalIds = new Set<string>();
        for (const [key, meta] of periodMeta.entries()) {
          if (!loadedKeys.has(key)) {
            missingGoalIds.add(meta.goal_id);
          }
        }
        if (missingGoalIds.size > 0) {
          for (const goalId of missingGoalIds) {
            await recalcGoalPeriods(goalId);
          }
          periodRows = await fetchPeriods();
        }

        const statusByKey = new Map<string, PeriodRow["status"]>();
        for (const row of periodRows) {
          const key = `${row.goal_id}:${row.period_start}:${row.period_end}`;
          statusByKey.set(key, row.status);
        }

        const nextStatusMap: DayStatusMap = {};
        for (const dayKey of dayKeys) {
          const presence = { ...EMPTY_STATUS };
          for (const periodKey of dayToPeriodKeys[dayKey]) {
            const status = statusByKey.get(periodKey);
            if (!status || status === "archived") continue;
            if (status === "success") presence.success = true;
            if (status === "in_progress") presence.in_progress = true;
            if (status === "fail") presence.fail = true;
          }
          if (presence.success || presence.in_progress || presence.fail) {
            nextStatusMap[dayKey] = presence;
          }
        }

        setStatusMap(nextStatusMap);
        setIsLoading(false);
        inFlightRef.current = false;
      })();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [days, dayKeys, dayKeySignature]);

  return { statusMap, isLoading, error };
}
