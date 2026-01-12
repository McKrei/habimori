export type ContextOption = {
  id: string;
  name: string;
};

export type TagOption = {
  id: string;
  name: string;
};

export type TimeEntry = {
  id: string;
  started_at: string;
  ended_at: string | null;
  context_id: string;
  goal_id: string | null;
  context?: ContextOption | null;
  tags?: TimeEntryTag[];
};

export type TimeEntryTag = {
  tag: TagOption;
};

export type TimeEntryWithDetails = TimeEntry & {
  tags: TimeEntryTag[];
};

export type TimeLogsFilters = {
  contextIds: string[];
  tagIds: string[];
};

export type GroupedTimeLogs = {
  [date: string]: {
    dateObj: Date;
    totalSeconds: number;
    contexts: {
      [contextId: string]: {
        context: ContextOption;
        entries: TimeEntryWithDetails[];
        aggregatedTags: TagOption[];
        totalSeconds: number;
        expanded: boolean;
      };
    };
  };
};
