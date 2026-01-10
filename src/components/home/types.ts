export type GoalSummary = {
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
  tags: { id: string; name: string }[];
};

export type CheckStateMap = Record<string, boolean>;

export type StatusMap = Record<
  string,
  { status: string; actual_value: number | null }
>;
