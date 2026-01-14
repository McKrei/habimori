"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAppStore,
  useStoreSelector,
  useAppTags,
  ensureTag as storeEnsureTag,
  updateGoal as storeUpdateGoal,
  archiveGoal as storeArchiveGoal,
  updateGoalTags as storeUpdateGoalTags,
  addManualTimeEntry as storeAddManualTimeEntry,
  addCounterEvent as storeAddCounterEvent,
  addCheckEvent as storeAddCheckEvent,
  deleteEvent as storeDeleteEvent,
  AppState
} from "@/src/store";
import type {
  CheckEvent,
  CounterEvent,
  GoalDetails,
  ProgressSummary,
  TimeEntry,
} from "./types";
import {
  calculateTimeMinutes,
  formatLocalInputDateTime,
  getPeriodBounds,
  getTodayDateString,
} from "./utils";

type UseGoalDetailsOptions = {
  goalId?: string;
  onArchived: () => void;
};

export function useGoalDetails({ goalId, onArchived }: UseGoalDetailsOptions) {
  const store = useAppStore();
  const { tags: allTags, isLoading: tagsLoading } = useAppTags();

  // -- Store Data --
  const goal = useStoreSelector((state: AppState) => {
    const found = state.goals.find(g => g.id === goalId);
    if (!found) return null;
    return {
      ...found,
      context: found.context,
      tags: found.tags
    } as GoalDetails;
  });

  const timeEntries = useStoreSelector((state: AppState) =>
    state.timeEntries
      .filter(e => e.goal_id === goalId)
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, 50) as TimeEntry[]
  );

  const counterEvents = useStoreSelector((state: AppState) =>
    state.counterEvents
      .filter(e => e.goal_id === goalId)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 50) as CounterEvent[]
  );

  const checkEvents = useStoreSelector((state: AppState) =>
    state.checkEvents
      .filter(e => e.goal_id === goalId)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 50) as CheckEvent[]
  );

  const isLoading = useStoreSelector((state: AppState) => !state.isInitialized);
  // We don't have a specific error for GoalDetails in store yet, but loadError is global
  const loadError = useStoreSelector((state: AppState) => state.loadError);

  // -- Local State for UI/Editing --
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<{ id: string; name: string }[]>([]);

  const [timeStart, setTimeStart] = useState(formatLocalInputDateTime(new Date()));
  const [timeEnd, setTimeEnd] = useState(formatLocalInputDateTime(new Date()));
  const [counterDelta, setCounterDelta] = useState("1");
  const [counterOccurredAt, setCounterOccurredAt] = useState(formatLocalInputDateTime(new Date()));
  const [checkOccurredAt, setCheckOccurredAt] = useState(formatLocalInputDateTime(new Date()));
  const [checkState, setCheckState] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Initialize edit fields when goal loads
  useEffect(() => {
    if (goal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditTitle(goal.title);
      setEditEndDate(goal.end_date);
      setSelectedTags(goal.tags || []);
    }
  }, [goal]);

  // -- Computed Progress --
  const progress = useMemo((): ProgressSummary | null => {
    if (!goal) return null;
    const { start, end } = getPeriodBounds(goal.period);

    if (goal.goal_type === "time") {
      const state = store.getState();
      const entries = state.timeEntries.filter(e => e.goal_id === goalId);
      const minutes = calculateTimeMinutes(entries as unknown as TimeEntry[], start, end);
      return { label: "Minutes this period", value: minutes };
    }

    if (goal.goal_type === "counter") {
      const state = store.getState();
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const events = state.counterEvents.filter(e =>
        e.goal_id === goalId &&
        e.occurred_at >= startIso &&
        e.occurred_at < endIso
      );
      const total = events.reduce((sum, e) => sum + e.value_delta, 0);
      return { label: "Count this period", value: total };
    }

    if (goal.goal_type === "check") {
      const state = store.getState();
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const relevant = state.checkEvents
        .filter(e =>
          e.goal_id === goalId &&
          e.occurred_at >= startIso &&
          e.occurred_at < endIso
        )
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

      const val = relevant.length > 0 && relevant[0].state ? 1 : 0;
      return { label: "Check state", value: val };
    }

    return null;
  }, [goal, goalId, store]);

  const progressValue = useMemo(() => {
    if (!goal || !progress) return "—";
    if (goal.goal_type === "time") {
      return `${progress.value} / ${goal.target_value} min`;
    }
    if (goal.goal_type === "counter") {
      return `${progress.value} / ${goal.target_value}`;
    }
    return progress.value ? "Done" : "Not done";
  }, [goal, progress]);

  // -- Handlers --

  const handleAddTag = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { tag, error: tagError } = await storeEnsureTag(store, trimmed);
    if (tagError || !tag) {
      setError(tagError ?? "Failed to add tag.");
      return;
    }
    setSelectedTags((prev) => {
      if (prev.some((item) => item.id === tag.id)) return prev;
      return [...prev, tag];
    });
    setTagInput("");
  };

  const handleAddTimeEntry = async () => {
    if (!goal) return;
    const start = new Date(timeStart);
    const end = new Date(timeEnd);
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    const { error: err } = await storeAddManualTimeEntry(
      store,
      goal.id,
      goal.context_id,
      start.toISOString(),
      end.toISOString()
    );
    if (err) setError(err);
    setIsSubmitting(false);
  };

  const handleAddCounterEvent = async () => {
    if (!goal) return;
    const delta = Number.parseInt(counterDelta, 10);
    if (!Number.isFinite(delta) || delta <= 0) {
      setError("Delta must be a positive integer.");
      return;
    }

    setIsSubmitting(true);
    storeAddCounterEvent(store, goal.id, goal.context_id, delta, new Date(counterOccurredAt).toISOString());
    setIsSubmitting(false);
  };

  const handleAddCheckEvent = async () => {
    if (!goal) return;
    setIsSubmitting(true);
    storeAddCheckEvent(store, goal.id, goal.context_id, checkState, new Date(checkOccurredAt).toISOString());
    setIsSubmitting(false);
  };

  const handleSaveGoal = async () => {
    if (!goal) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    const today = getTodayDateString();
    if (editEndDate < today) {
      setError("End date cannot be before today.");
      return;
    }
    if (editEndDate < goal.start_date) {
      setError("End date must be after start date.");
      return;
    }

    setIsSaving(true);
    const { error: updateErr } = await storeUpdateGoal(store, goal.id, {
      title: trimmedTitle,
      end_date: editEndDate
    });

    if (updateErr) {
      setError(updateErr);
      setIsSaving(false);
      return;
    }

    const { error: tagsErr } = await storeUpdateGoalTags(store, goal.id, selectedTags.map(t => t.id));
    if (tagsErr) setError(tagsErr);

    setIsSaving(false);
  };

  const handleArchiveGoal = async () => {
    if (!goal) return;
    setIsArchiving(true);
    const { error: err } = await storeArchiveGoal(store, goal.id);
    if (err) {
      setError(err);
      setIsArchiving(false);
      return;
    }
    setIsArchiving(false);
    onArchived();
  };

  const handleDeleteEvent = async (type: "time" | "counter" | "check", id: string) => {
    const { error: err } = await storeDeleteEvent(store, type, id);
    if (err) setError(err);
  };

  return {
    checkEvents,
    checkOccurredAt,
    checkState,
    counterDelta,
    counterEvents,
    counterOccurredAt,
    editEndDate,
    editTitle,
    error: error || loadError,
    goal,
    handleAddCheckEvent,
    handleAddCounterEvent,
    handleAddTimeEntry,
    handleArchiveGoal,
    handleAddTag,
    handleDeleteEvent,
    handleSaveGoal,
    isArchiving,
    isLoading,
    isSaving,
    isSubmitting,
    progressValue,
    selectedTags,
    setCheckOccurredAt,
    setCheckState,
    setCounterDelta,
    setCounterOccurredAt,
    setEditEndDate,
    setEditTitle,
    setSelectedTags,
    setTagInput,
    setTimeEnd,
    setTimeStart,
    tagInput,
    tags: allTags,
    tagsLoading,
    timeEnd,
    timeEntries,
    timeStart,
  };
}
