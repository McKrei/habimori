import type { GoalDetails, TimeEntry } from "./types";

export function getPeriodBounds(period: GoalDetails["period"]) {
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

export function formatLocalInputDateTime(value: Date) {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function getTodayDateString() {
  const now = new Date();
  const localMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return localMidnight.toISOString().slice(0, 10);
}

export function calculateTimeMinutes(
  entries: TimeEntry[],
  start: Date,
  end: Date,
) {
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
