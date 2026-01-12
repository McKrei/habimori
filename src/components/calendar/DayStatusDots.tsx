"use client";

import type { DayStatusCounts } from "./useDayStatusMap";

type DayStatusDotsProps = {
  statuses?: DayStatusCounts;
};

/**
 * @deprecated Use CalendarDay with DonutRing instead.
 * Kept for backward compatibility.
 */
export default function DayStatusDots({ statuses }: DayStatusDotsProps) {
  if (!statuses) return null;
  return (
    <div className="mt-1 flex items-center justify-center gap-1">
      {statuses.success > 0 ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      ) : null}
      {statuses.in_progress > 0 ? (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      ) : null}
      {statuses.fail > 0 ? (
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      ) : null}
    </div>
  );
}
