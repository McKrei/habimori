"use client";

// =============================================================================
// ENTITY TYPES (matches DB schema)
// =============================================================================

export type GoalType = "time" | "counter" | "check";
export type GoalPeriod = "day" | "week" | "month";
export type TargetOp = "gte" | "lte";
export type GoalStatus = "success" | "fail" | "in_progress" | "archived";

export type Goal = {
  id: string;
  title: string;
  goal_type: GoalType;
  period: GoalPeriod;
  target_value: number;
  target_op: TargetOp;
  start_date: string;
  end_date: string;
  context_id: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  // Denormalized for convenience
  context: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
};

export type Context = {
  id: string;
  name: string;
};

export type Tag = {
  id: string;
  name: string;
};

export type TimeEntry = {
  id: string;
  goal_id: string | null;
  context_id: string;
  started_at: string;
  ended_at: string | null;
  tag_ids: string[];
};

export type CounterEvent = {
  id: string;
  goal_id: string | null;
  context_id: string;
  occurred_at: string;
  value_delta: number;
};

export type CheckEvent = {
  id: string;
  goal_id: string | null;
  context_id: string;
  occurred_at: string;
  state: boolean;
};

export type GoalPeriodRecord = {
  goal_id: string;
  period_start: string;
  period_end: string;
  actual_value: number;
  status: GoalStatus;
  calculated_at: string;
};

// =============================================================================
// STORE STATE
// =============================================================================

export type AppState = {
  // Auth
  userId: string | null;

  // Core entities
  goals: Goal[];
  contexts: Context[];
  tags: Tag[];

  // Events (cached for ~60 day window)
  timeEntries: TimeEntry[];
  counterEvents: CounterEvent[];
  checkEvents: CheckEvent[];

  // Cached goal periods (server-side computed, used for calendar)
  goalPeriods: GoalPeriodRecord[];

  // Active timer (single entry with ended_at=null)
  activeTimer: TimeEntry | null;

  // Loading states
  isInitialized: boolean;
  isLoading: boolean;
  loadError: string | null;

  // Pending mutations queue
  pendingMutations: PendingMutation[];
  syncError: string | null;
};

// =============================================================================
// MUTATIONS (optimistic updates)
// =============================================================================

export type MutationType =
  | "ADD_COUNTER_EVENT"
  | "ADD_CHECK_EVENT"
  | "ADD_TIME_ENTRY"
  | "UPDATE_TIME_ENTRY"
  | "DELETE_TIME_ENTRY"
  | "ADD_GOAL"
  | "UPDATE_GOAL"
  | "ARCHIVE_GOAL"
  | "ADD_CONTEXT"
  | "UPDATE_CONTEXT"
  | "DELETE_CONTEXT"
  | "ADD_TAG"
  | "UPDATE_TAG"
  | "DELETE_TAG";

export type PendingMutation = {
  id: string;
  type: MutationType;
  payload: unknown;
  createdAt: number;
  status: "pending" | "syncing" | "failed";
  retries: number;
};

// =============================================================================
// ACTIONS
// =============================================================================

export type AppAction =
  // Initialization
  | { type: "INIT_START" }
  | { type: "INIT_SUCCESS"; payload: InitPayload }
  | { type: "INIT_ERROR"; error: string }

  // Goal mutations
  | { type: "ADD_GOAL"; goal: Goal }
  | { type: "UPDATE_GOAL"; goalId: string; updates: Partial<Goal> }
  | { type: "ARCHIVE_GOAL"; goalId: string }

  // Context mutations
  | { type: "ADD_CONTEXT"; context: Context }
  | { type: "UPDATE_CONTEXT"; contextId: string; name: string }
  | { type: "DELETE_CONTEXT"; contextId: string }

  // Tag mutations
  | { type: "ADD_TAG"; tag: Tag }
  | { type: "UPDATE_TAG"; tagId: string; name: string }
  | { type: "DELETE_TAG"; tagId: string }

  // Event mutations (optimistic)
  | { type: "ADD_COUNTER_EVENT"; event: CounterEvent }
  | { type: "ADD_CHECK_EVENT"; event: CheckEvent }
  | { type: "ADD_TIME_ENTRY"; entry: TimeEntry }
  | { type: "UPDATE_TIME_ENTRY"; entryId: string; updates: Partial<TimeEntry> }
  | { type: "DELETE_TIME_ENTRY"; entryId: string }
  | { type: "DELETE_COUNTER_EVENT"; eventId: string }
  | { type: "DELETE_CHECK_EVENT"; eventId: string }
  | { type: "REPLACE_COUNTER_EVENT_ID"; tempId: string; realId: string }
  | { type: "REPLACE_CHECK_EVENT_ID"; tempId: string; realId: string }
  | { type: "REPLACE_TIME_ENTRY_ID"; tempId: string; realId: string }

  // Timer (immediate write, not batched)
  | { type: "START_TIMER"; entry: TimeEntry }
  | { type: "STOP_TIMER"; endedAt: string }
  | { type: "CLEAR_TIMER" }

  // Sync
  | { type: "QUEUE_MUTATION"; mutation: PendingMutation }
  | { type: "SET_PENDING_MUTATIONS"; mutations: PendingMutation[] }
  | { type: "MUTATION_SYNCED"; mutationId: string }
  | { type: "MUTATION_FAILED"; mutationId: string; error: string }
  | { type: "CLEAR_SYNC_ERROR" }

  // Goal periods (lazy refresh)
  | { type: "SET_GOAL_PERIODS"; periods: GoalPeriodRecord[] }
  | { type: "UPSERT_GOAL_PERIOD"; period: GoalPeriodRecord };

export type InitPayload = {
  userId: string;
  goals: Goal[];
  contexts: Context[];
  tags: Tag[];
  timeEntries: TimeEntry[];
  counterEvents: CounterEvent[];
  checkEvents: CheckEvent[];
  goalPeriods: GoalPeriodRecord[];
  activeTimer: TimeEntry | null;
};

// =============================================================================
// STORE INTERFACE
// =============================================================================

export type AppStore = {
  getState: () => AppState;
  dispatch: (action: AppAction) => void;
  subscribe: (listener: () => void) => () => void;
};
