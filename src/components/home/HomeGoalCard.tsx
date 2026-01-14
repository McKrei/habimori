"use client";

import Link from "next/link";
import { formatSecondsAsHHMMSS, formatMinutesAsHHMM } from "@/src/components/formatters";
import type { GoalSummary, StatusMap } from "./types";
import PlayIcon from "@/src/components/icons/PlayIcon";
import StopIcon from "@/src/components/icons/StopIcon";
import CheckIcon from "@/src/components/icons/CheckIcon";
import PlusIcon from "@/src/components/icons/PlusIcon";

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
}: HomeGoalCardProps) {
  const contextLabel = goal.context?.name ?? "—";
  const effectiveStatus = optimisticStatus ?? statusEntry?.status;
  const baseActual = statusEntry?.actual_value ?? 0;
  const effectiveActual =
    goal.goal_type === "counter" ? baseActual + optimisticDelta : baseActual;
  const isPositive = goal.target_op === "gte";

  // Status-based styling (subtle left border accent)
  const statusAccent =
    effectiveStatus === "success"
      ? "border-l-emerald-400"
      : effectiveStatus === "fail"
        ? "border-l-rose-400"
        : effectiveStatus === "in_progress"
          ? "border-l-amber-400"
          : "border-l-slate-200";

  // Goal type colors
  const accentColor = isPositive ? "text-emerald-600" : "text-rose-500";
  const accentColorLight = isPositive ? "text-emerald-500" : "text-rose-400";
  const accentBg = isPositive ? "bg-emerald-500/10" : "bg-rose-500/10";
  const accentBgHover = isPositive ? "hover:bg-emerald-500/15" : "hover:bg-rose-500/15";
  const accentBorder = isPositive ? "border-emerald-500/30" : "border-rose-500/30";
  const accentFocusRing = isPositive ? "focus:ring-emerald-500/30" : "focus:ring-rose-500/30";

  const baseTimeSeconds =
    goal.goal_type === "time"
      ? isActiveTimer
        ? (activeBaseSeconds[goal.id] ?? timeSecondsMap[goal.id] ?? 0)
        : (timeOverrides[goal.id] ?? timeSecondsMap[goal.id] ?? 0)
      : 0;

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
      className={`
        group relative w-full min-w-0 max-w-full rounded-xl border border-border-light border-l-[3px] bg-surface
        px-4 py-3 shadow-sm transition-all duration-200
        hover:shadow-md hover:border-border
        ${statusAccent}
      `}
    >
      {/* Status indicator dot */}
      {hasError ? (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
      ) : isPending ? (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      ) : null}

      <div className="flex min-w-0 items-center gap-4">
        {/* Left: Title and meta */}
        <div className="min-w-0 flex-1">
          <Link
            className="block truncate text-base font-medium text-text-primary transition-colors hover:text-text-secondary"
            href={`/goals/${goal.id}`}
          >
            {goal.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-text-faint">
            {goal.period} · {contextLabel}
            {goal.tags.length > 0 && (
              <span className="opacity-70">
                {" "}· {goal.tags.map((tag) => `#${tag.name}`).join(" ")}
              </span>
            )}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Counter goal */}
          {goal.goal_type === "counter" && (
            <>
              <div className="text-right">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-medium tabular-nums text-text-secondary">
                    {effectiveActual}
                  </span>
                  <span className="text-text-faint">/</span>
                  <span className={`text-lg font-medium tabular-nums ${accentColorLight}`}>
                    {goal.target_value}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  className={`
                    w-12 rounded-lg border ${accentBorder} bg-surface px-2 py-1.5
                    text-center text-sm tabular-nums text-text-secondary
                    transition-all duration-150
                    placeholder:text-text-faint
                    focus:outline-none focus:ring-2 ${accentFocusRing} focus:border-transparent
                  `}
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
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-lg
                    ${accentBg} ${accentColor} border ${accentBorder}
                    transition-all duration-150
                    ${accentBgHover} hover:scale-105
                    active:scale-95
                  `}
                  type="button"
                  onClick={onCounterSubmit}
                >
                  <PlusIcon size={18} />
                </button>
              </div>
            </>
          )}

          {/* Time goal */}
          {goal.goal_type === "time" && (
            <>
              <div className="text-right">
                <div className={`text-lg font-medium tabular-nums ${accentColor}`}>
                  {isActiveTimer
                    ? formatSecondsAsHHMMSS(totalSeconds)
                    : formatSecondsAsHHMMSS(baseTimeSeconds)}
                </div>
                <div className="text-[10px] tabular-nums text-text-faint">
                  {formatMinutesAsHHMM(goal.target_value)}
                </div>
              </div>
              {isActiveTimer ? (
                <button
                  className={`
                    flex h-9 w-9 items-center justify-center rounded-xl
                    ${accentBg} ${accentColor} border ${accentBorder}
                    transition-all duration-150
                    ${accentBgHover} hover:scale-105
                    active:scale-95
                  `}
                  type="button"
                  onClick={onStopTimer}
                >
                  <StopIcon size={18} />
                </button>
              ) : (
                <button
                  className={`
                    flex h-9 w-9 items-center justify-center rounded-xl
                    ${accentBg} ${accentColor} border ${accentBorder}
                    transition-all duration-150
                    ${accentBgHover} hover:scale-105
                    active:scale-95
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                  `}
                  type="button"
                  onClick={onStartTimer}
                  disabled={isTimerBlocked}
                >
                  <PlayIcon size={18} />
                </button>
              )}
            </>
          )}

          {/* Check goal */}
          {goal.goal_type === "check" && (
            <button
              className={`
                flex h-9 w-9 items-center justify-center rounded-xl
                border transition-all duration-200
                ${
                  checkState
                    ? `${accentBg} ${accentColor} ${accentBorder}`
                    : "border-border bg-surface text-text-faint hover:border-text-faint hover:text-text-muted"
                }
                hover:scale-105 active:scale-95
              `}
              type="button"
              onClick={() => onCheckToggle(!checkState)}
            >
              <CheckIcon
                size={20}
                className={`transition-all duration-200 ${checkState ? "opacity-100" : "opacity-30"}`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
