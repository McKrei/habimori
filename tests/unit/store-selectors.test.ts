import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type {
  AppState,
  Goal,
  TimeEntry,
  CounterEvent,
  CheckEvent,
} from "@/src/store/types";
import {
  selectGoalsForDate,
  selectStatusMapForDate,
  selectDayStatusMap,
  selectTimeSecondsForGoal,
} from "@/src/store/selectors";

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    userId: "user-1",
    goals: [],
    contexts: [],
    tags: [],
    timeEntries: [],
    counterEvents: [],
    checkEvents: [],
    goalPeriods: [],
    activeTimer: null,
    isInitialized: true,
    isLoading: false,
    loadError: null,
    pendingMutations: [],
    syncError: null,
    ...overrides,
  };
}

describe("store selectors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("selectGoalsForDate filters by start/end and active flags", () => {
    const goals: Goal[] = [
      {
        id: "g1",
        title: "Goal 1",
        goal_type: "counter",
        period: "day",
        target_value: 5,
        target_op: "gte",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        context_id: "c1",
        is_active: true,
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        context: { id: "c1", name: "Work" },
        tags: [],
      },
      {
        id: "g2",
        title: "Archived",
        goal_type: "counter",
        period: "day",
        target_value: 5,
        target_op: "gte",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        context_id: "c1",
        is_active: true,
        is_archived: true,
        created_at: "2024-01-01T00:00:00Z",
        context: { id: "c1", name: "Work" },
        tags: [],
      },
    ];
    const state = baseState({ goals });
    const result = selectGoalsForDate(state, new Date("2024-01-15T12:00:00"));
    expect(result.map((g) => g.id)).toEqual(["g1"]);
  });

  it("selectStatusMapForDate computes statuses from local events", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    const goals: Goal[] = [
      {
        id: "time-1",
        title: "Time goal",
        goal_type: "time",
        period: "day",
        target_value: 60,
        target_op: "gte",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        context_id: "c1",
        is_active: true,
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        context: { id: "c1", name: "Work" },
        tags: [],
      },
      {
        id: "check-1",
        title: "Check goal",
        goal_type: "check",
        period: "day",
        target_value: 1,
        target_op: "gte",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        context_id: "c1",
        is_active: true,
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        context: { id: "c1", name: "Work" },
        tags: [],
      },
    ];
    const timeEntries: TimeEntry[] = [
      {
        id: "t1",
        goal_id: "time-1",
        context_id: "c1",
        started_at: "2024-01-15T09:00:00Z",
        ended_at: "2024-01-15T09:30:00Z",
        tag_ids: [],
      },
      {
        id: "t2",
        goal_id: "time-1",
        context_id: "c1",
        started_at: "2024-01-15T11:00:00Z",
        ended_at: null,
        tag_ids: [],
      },
    ];
    const checkEvents: CheckEvent[] = [
      {
        id: "c1",
        goal_id: "check-1",
        context_id: "c1",
        occurred_at: "2024-01-15T08:00:00Z",
        state: false,
      },
      {
        id: "c2",
        goal_id: "check-1",
        context_id: "c1",
        occurred_at: "2024-01-15T09:00:00Z",
        state: true,
      },
    ];
    const state = baseState({ goals, timeEntries, checkEvents });
    const map = selectStatusMapForDate(
      state,
      goals,
      new Date("2024-01-15T12:00:00Z"),
    );
    expect(map["time-1"].actual_value).toBe(30);
    expect(map["time-1"].status).toBe("in_progress");
    expect(map["check-1"].actual_value).toBe(1);
    expect(map["check-1"].status).toBe("success");
  });

  it("selectDayStatusMap aggregates statuses per day", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    const goals: Goal[] = [
      {
        id: "counter-1",
        title: "Counter goal",
        goal_type: "counter",
        period: "day",
        target_value: 3,
        target_op: "gte",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        context_id: "c1",
        is_active: true,
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        context: { id: "c1", name: "Work" },
        tags: [],
      },
    ];
    const counterEvents: CounterEvent[] = [
      {
        id: "ce1",
        goal_id: "counter-1",
        context_id: "c1",
        occurred_at: "2024-01-15T08:00:00Z",
        value_delta: 2,
      },
    ];
    const state = baseState({ goals, counterEvents });
    const map = selectDayStatusMap(state, [
      new Date("2024-01-15T12:00:00Z"),
      new Date("2024-01-16T12:00:00Z"),
    ]);
    expect(map["2024-01-15"]).toEqual({ success: 0, in_progress: 1, fail: 0 });
    expect(map["2024-01-16"]).toEqual({ success: 0, in_progress: 1, fail: 0 });
  });

  it("selectTimeSecondsForGoal ignores active entries without ended_at", () => {
    const goals: Goal[] = [
      {
        id: "time-2",
        title: "Time goal",
        goal_type: "time",
        period: "day",
        target_value: 60,
        target_op: "gte",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        context_id: "c1",
        is_active: true,
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        context: { id: "c1", name: "Work" },
        tags: [],
      },
    ];
    const timeEntries: TimeEntry[] = [
      {
        id: "t1",
        goal_id: "time-2",
        context_id: "c1",
        started_at: "2024-01-15T09:00:00Z",
        ended_at: "2024-01-15T09:30:00Z",
        tag_ids: [],
      },
      {
        id: "t2",
        goal_id: "time-2",
        context_id: "c1",
        started_at: "2024-01-15T10:00:00Z",
        ended_at: null,
        tag_ids: [],
      },
    ];
    const state = baseState({ goals, timeEntries });
    const seconds = selectTimeSecondsForGoal(
      state,
      "time-2",
      new Date("2024-01-15T12:00:00Z"),
    );
    expect(seconds).toBe(1800);
  });
});
