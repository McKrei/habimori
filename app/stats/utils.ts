export function toDateInput(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date) {
    const day = date.getDay();
    const diff = (day + 6) % 7;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - diff);
    return start;
}

export function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

export function listDates(start: Date, end: Date) {
    const dates: string[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
        dates.push(toDateInput(cursor));
        cursor = addDays(cursor, 1);
    }
    return dates;
}

export function calculateDurationSeconds(
    startedAt: string,
    endedAt: string | null,
): number {
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    return Math.max(0, Math.round((end - start) / 1000));
}

export function formatDayLabel(date: Date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}`;
}

export function formatRangeLabel(start: Date, end: Date) {
    const startLabel = formatDayLabel(start);
    const endLabel = formatDayLabel(end);
    if (startLabel === endLabel) {
        return startLabel;
    }
    return `${startLabel}-${endLabel}`;
}

export function formatMinutesWithDays(totalMinutes: number) {
    const minutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
