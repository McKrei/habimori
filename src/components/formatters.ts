export function formatDate(dateValue?: string | null) {
  if (!dateValue) return "—";
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString();
}

export function formatDateTime(dateValue?: string | null) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  return date.toLocaleString();
}

export function formatDurationMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)} h`;
}

export function formatMinutesAsHHMM(minutes: number) {
  if (!Number.isFinite(minutes)) return "--:--";
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatSecondsAsHHMMSS(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--:--";
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0",
  )}:${String(secs).padStart(2, "0")}`;
}

export function formatGoalTarget(goal: {
  goal_type: string;
  target_value: number;
  target_op: string;
}) {
  const opLabel = goal.target_op === "lte" ? "≤" : "≥";
  if (goal.goal_type === "time") {
    return `${opLabel} ${goal.target_value} min`;
  }
  if (goal.goal_type === "check") {
    return `${opLabel} ${goal.target_value}`;
  }
  return `${opLabel} ${goal.target_value}`;
}
