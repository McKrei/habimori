"use client";

import Link from "next/link";
import { formatSecondsAsHHMMSS, formatMinutesAsHHMM } from "@/src/components/formatters";
import type { GoalSummary, StatusMap } from "./types";
import { useTranslation } from "@/src/i18n/TranslationContext";

type HomeGoalCardProps = {
  goal: GoalSummary;
  statusEntry?: StatusMap[string];
  optimisticDelta: number;
  optimisticStatus?: string;
  checkState: boolean;
  isActiveTimer: boolean;
  isTimerBlocked: boolean;
  activeEntryStartedAt?: string | null;
  now: Date;
  activeBaseSeconds: Record<string, number>;
  timeOverrides: Record<string, number | null>;
  timeSecondsMap: Record<string, number>;
  isPending: boolean;
  hasError: boolean;
  counterValue: string;
  onCounterChange: (value: string) => void;
  onCounterSubmit: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onCheckToggle: (nextState: boolean) => void;
  lng: string;
};

export default function HomeGoalCard({
  goal,
  statusEntry,
  optimisticDelta,
  optimisticStatus,
  checkState,
  isActiveTimer,
  isTimerBlocked,
  activeEntryStartedAt,
  now,
  activeBaseSeconds,
  timeOverrides,
  timeSecondsMap,
  isPending,
  hasError,
  counterValue,
  onCounterChange,
  onCounterSubmit,
  onStartTimer,
  onStopTimer,
  onCheckToggle,
  lng: _lng,
}: HomeGoalCardProps) {
  const { t } = useTranslation();
  const contextLabel = goal.context?.name ?? t("goalDetails.unknownContext");
  const effectiveStatus = optimisticStatus ?? statusEntry?.status;
  const baseActual = statusEntry?.actual_value ?? 0;
  const effectiveActual =
    goal.goal_type === "counter" ? baseActual + optimisticDelta : baseActual;
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
  const baseTimeSeconds =
    goal.goal_type === "time"
      ? isActiveTimer
        ? (activeBaseSeconds[goal.id] ?? timeSecondsMap[goal.id] ?? 0)
        : (timeOverrides[goal.id] ?? timeSecondsMap[goal.id] ?? 0)
      : 0;
  const displayValue =
    goal.goal_type === "time"
      ? formatSecondsAsHHMMSS(baseTimeSeconds)
      : `${effectiveActual}`;
  const activeSeconds =
    isActiveTimer && activeEntryStartedAt
      ? Math.max(
          0,
          Math.ceil(
            (now.getTime() - new Date(activeEntryStartedAt).getTime()) / 1000,
          ),
        )
      : 0;
  const totalSeconds =
    goal.goal_type === "time" ? baseTimeSeconds + activeSeconds : 0;

  return (
    <div
      className={`relative rounded-2xl border bg-white px-5 py-2 ${borderColor}`}
    >
      {hasError ? (
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
      ) : isPending ? (
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-amber-400" />
      ) : null}
      <div className="grid grid-cols-[1fr_1fr] items-center gap-3">
        <div className="min-w-0">
          <Link
            className="block max-h-[3.2rem] overflow-hidden break-words text-[clamp(1.15rem,4vw,1.4rem)] font-semibold leading-snug text-slate-900 hover:text-slate-700 md:text-[clamp(1.1rem,1.6vw,1.35rem)]"
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
                <span className="text-slate-900">{displayValue}</span>
                <span className="text-slate-300"> / </span>
                <span className={accentColor}>{goal.target_value}</span>
              </div>
              <input
                className={`w-12 rounded-md border px-2 py-1 text-sm md:w-16 ${actionBorder}`}
                inputMode="numeric"
                placeholder="1"
                value={counterValue}
                onChange={(event) => onCounterChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onCounterSubmit();
                  }
                }}
              />
              <button
                className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                type="button"
                onClick={onCounterSubmit}
              >
                +
              </button>
            </>
          ) : null}

          {goal.goal_type === "time" ? (
            <>
              <div className="flex flex-col items-end">
                <div className={`text-xl font-semibold md:text-2xl ${accentColor}`}>
                  {isActiveTimer
                    ? formatSecondsAsHHMMSS(totalSeconds)
                    : formatSecondsAsHHMMSS(baseTimeSeconds)}
                </div>
                <div className="text-xs text-slate-400">
                  {formatMinutesAsHHMM(goal.target_value)}
                </div>
              </div>
              {isActiveTimer ? (
                <button
                  className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                  type="button"
                  onClick={onStopTimer}
                  title={t("common.stop")}
                >
                  ⏸
                </button>
              ) : (
                <button
                  className={`h-9 w-9 rounded-lg border-2 ${actionBorder} text-xl font-semibold leading-none md:h-10 md:w-10 md:text-2xl`}
                  type="button"
                  onClick={onStartTimer}
                  disabled={isTimerBlocked}
                  title={isTimerBlocked ? t("timer.anotherRunning") : t("common.start")}
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
              onClick={() => onCheckToggle(!checkState)}
            >
              <span className={actionText}>{checkState ? "✓" : ""}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
