export type GoalDetails = {
  id: string;
  title: string;
  goal_type: "time" | "counter" | "check";
  period: "day" | "week" | "month";
  target_value: number;
  target_op: "gte" | "lte";
  start_date: string;
  end_date: string;
  context_id: string;
  is_archived: boolean;
  context: { id: string; name: string } | null;
};

export type TimeEntry = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

export type CounterEvent = {
  id: string;
  occurred_at: string;
  value_delta: number;
};

export type CheckEvent = {
  id: string;
  occurred_at: string;
  state: boolean;
};

export type ProgressSummary = {
  label: string;
  value: number;
};
