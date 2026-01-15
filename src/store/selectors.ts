"use client";

import type {
    AppState,
    Goal,
    GoalStatus,
    TimeEntry,
    CounterEvent,
    CheckEvent,
} from "./types";

// =============================================================================
// DATE UTILITIES
// =============================================================================

function toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

export function getPeriodRange(
    period: Goal["period"],
    date: Date
): { start: Date; end: Date; period_start: string; period_end: string } {
    const dayStart = startOfDay(date);

    if (period === "day") {
        const start = dayStart;
        const end = addDays(start, 1);
        return {
            start,
            end,
            period_start: toISODate(start),
            period_end: toISODate(start),
        };
    }

    if (period === "week") {
        const day = dayStart.getDay();
        const diff = (day + 6) % 7;
        const start = addDays(dayStart, -diff);
        const end = addDays(start, 7);
        return {
            start,
            end,
            period_start: toISODate(start),
            period_end: toISODate(addDays(start, 6)),
        };
    }

    // month
    const start = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
    const end = new Date(dayStart.getFullYear(), dayStart.getMonth() + 1, 1);
    const periodEnd = addDays(end, -1);
    return {
        start,
        end,
        period_start: toISODate(start),
        period_end: toISODate(periodEnd),
    };
}

// =============================================================================
// GOAL SELECTORS
// =============================================================================

/**
 * Get goals active for a specific date (within start_date <= date <= end_date)
 */
export function selectGoalsForDate(state: AppState, date: Date): Goal[] {
    const dateKey = toISODate(date);
    return state.goals.filter(
        (goal) =>
            goal.is_active &&
            !goal.is_archived &&
            goal.start_date <= dateKey &&
            goal.end_date >= dateKey
    );
}

/**
 * Compute actual value for a goal within a period (from local events)
 */
export function computeActualValue(
    state: AppState,
    goal: Goal,
    date: Date
): number {
    const { start, end } = getPeriodRange(goal.period, date);

    if (goal.goal_type === "time") {
        return computeTimeMinutes(state.timeEntries, goal.id, start, end);
    }

    if (goal.goal_type === "counter") {
        return computeCounterSum(state.counterEvents, goal.id, start, end);
    }

    if (goal.goal_type === "check") {
        return computeCheckState(state.checkEvents, goal.id, start, end) ? 1 : 0;
    }

    return 0;
}

/**
 * Compute status for a goal (locally, without server)
 */
export function computeGoalStatus(
    state: AppState,
    goal: Goal,
    date: Date
): GoalStatus {
    if (goal.is_archived) return "archived";

    const { end } = getPeriodRange(goal.period, date);
    const actualValue = computeActualValue(state, goal, date);
    const now = new Date();

    if (goal.target_op === "gte") {
        if (actualValue >= goal.target_value) return "success";
        return now < end ? "in_progress" : "fail";
    }

    // lte
    if (actualValue > goal.target_value) return "fail";
    return now < end ? "in_progress" : "success";
}

/**
 * Get status map for multiple goals on a date (used by home page)
 */
export function selectStatusMapForDate(
    state: AppState,
    goals: Goal[],
    date: Date
): Record<string, { status: GoalStatus; actual_value: number }> {
    const result: Record<string, { status: GoalStatus; actual_value: number }> = {};
    for (const goal of goals) {
        result[goal.id] = {
            status: computeGoalStatus(state, goal, date),
            actual_value: computeActualValue(state, goal, date),
        };
    }
    return result;
}

// =============================================================================
// TIME ENTRIES
// =============================================================================

function computeTimeMinutes(
    entries: TimeEntry[],
    goalId: string,
    start: Date,
    end: Date
): number {
    let totalMs = 0;
    const MS_IN_MINUTE = 60000;

    for (const entry of entries) {
        if (entry.goal_id !== goalId) continue;
        if (!entry.ended_at) continue; // Skip active timers

        const entryStart = new Date(entry.started_at);
        const entryEnd = new Date(entry.ended_at);

        // Skip if completely outside range
        if (entryEnd <= start || entryStart >= end) continue;

        // Calculate overlap
        const overlapStart = entryStart > start ? entryStart : start;
        const overlapEnd = entryEnd < end ? entryEnd : end;

        if (overlapEnd > overlapStart) {
            totalMs += overlapEnd.getTime() - overlapStart.getTime();
        }
    }

    return Math.round(totalMs / MS_IN_MINUTE);
}

/**
 * Get time in seconds for a goal (used for display with running timer)
 */
export function selectTimeSecondsForGoal(
    state: AppState,
    goalId: string,
    date: Date
): number {
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal || goal.goal_type !== "time") return 0;

    const { start, end } = getPeriodRange(goal.period, date);
    let totalMs = 0;

    for (const entry of state.timeEntries) {
        if (entry.goal_id !== goalId) continue;
        if (!entry.ended_at) continue;

        const entryStart = new Date(entry.started_at);
        const entryEnd = new Date(entry.ended_at);

        if (entryEnd <= start || entryStart >= end) continue;

        const overlapStart = entryStart > start ? entryStart : start;
        const overlapEnd = entryEnd < end ? entryEnd : end;

        if (overlapEnd > overlapStart) {
            totalMs += overlapEnd.getTime() - overlapStart.getTime();
        }
    }

    return Math.ceil(totalMs / 1000);
}

export function selectTimeSecondsMap(
    state: AppState,
    goals: Goal[],
    date: Date
): Record<string, number> {
    const result: Record<string, number> = {};
    for (const goal of goals) {
        if (goal.goal_type === 'time') {
            result[goal.id] = selectTimeSecondsForGoal(state, goal.id, date);
        }
    }
    return result;
}

// =============================================================================
// COUNTER EVENTS
// =============================================================================

function computeCounterSum(
    events: CounterEvent[],
    goalId: string,
    start: Date,
    end: Date
): number {
    let total = 0;

    for (const event of events) {
        if (event.goal_id !== goalId) continue;

        const occurredAt = new Date(event.occurred_at);
        if (occurredAt >= start && occurredAt < end) {
            total += event.value_delta;
        }
    }

    return total;
}

// =============================================================================
// CHECK EVENTS
// =============================================================================

function computeCheckState(
    events: CheckEvent[],
    goalId: string,
    start: Date,
    end: Date
): boolean {
    // Find the latest check event in the period
    let latestEvent: CheckEvent | null = null;
    let latestTime = 0;

    for (const event of events) {
        if (event.goal_id !== goalId) continue;

        const occurredAt = new Date(event.occurred_at);
        if (occurredAt >= start && occurredAt < end) {
            const time = occurredAt.getTime();
            if (time > latestTime) {
                latestTime = time;
                latestEvent = event;
            }
        }
    }

    return latestEvent?.state ?? false;
}

export function selectCheckStateForGoal(
    state: AppState,
    goalId: string,
    date: Date
): boolean {
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal || goal.goal_type !== "check") return false;

    const { start, end } = getPeriodRange(goal.period, date);
    return computeCheckState(state.checkEvents, goalId, start, end);
}

export function selectCheckStatesMap(
    state: AppState,
    goals: Goal[],
    date: Date
): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const goal of goals) {
        if (goal.goal_type === 'check') {
            result[goal.id] = selectCheckStateForGoal(state, goal.id, date);
        }
    }
    return result;
}

// =============================================================================
// CALENDAR (day status counts)
// =============================================================================

export type DayStatusCounts = {
    success: number;
    in_progress: number;
    fail: number;
};

/**
 * Compute status counts for multiple days (used by week calendar)
 */
export function selectDayStatusMap(
    state: AppState,
    days: Date[]
): Record<string, DayStatusCounts> {
    const result: Record<string, DayStatusCounts> = {};

    for (const day of days) {
        const dayKey = toISODate(day);
        const goals = selectGoalsForDate(state, day);
        const counts: DayStatusCounts = { success: 0, in_progress: 0, fail: 0 };

        for (const goal of goals) {
            const status = computeGoalStatus(state, goal, day);
            if (status === "success") counts.success++;
            else if (status === "in_progress") counts.in_progress++;
            else if (status === "fail") counts.fail++;
        }

        if (counts.success > 0 || counts.in_progress > 0 || counts.fail > 0) {
            result[dayKey] = counts;
        }
    }

    return result;
}
