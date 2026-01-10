"use client";

import type { DayStatusPresence } from "./useDayStatusMap";

type DayStatusDotsProps = {
  statuses?: DayStatusPresence;
};

export default function DayStatusDots({ statuses }: DayStatusDotsProps) {
  if (!statuses) return null;
  return (
    <div className="mt-1 flex items-center justify-center gap-1">
      {statuses.success ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      ) : null}
      {statuses.in_progress ? (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      ) : null}
      {statuses.fail ? (
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      ) : null}
    </div>
  );
}
