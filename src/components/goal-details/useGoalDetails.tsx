"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";
import { recalcGoalPeriods } from "@/src/components/goalPeriods";
import { useTags } from "@/src/components/useTags";
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
  const { tags, ensureTag, isLoading: tagsLoading } = useTags();
  const [goal, setGoal] = useState<GoalDetails | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [counterEvents, setCounterEvents] = useState<CounterEvent[]>([]);
  const [checkEvents, setCheckEvents] = useState<CheckEvent[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<
    { id: string; name: string }[]
  >([]);
  const [timeStart, setTimeStart] = useState(
    formatLocalInputDateTime(new Date()),
  );
  const [timeEnd, setTimeEnd] = useState(formatLocalInputDateTime(new Date()));
  const [counterDelta, setCounterDelta] = useState("1");
  const [counterOccurredAt, setCounterOccurredAt] = useState(
    formatLocalInputDateTime(new Date()),
  );
  const [checkOccurredAt, setCheckOccurredAt] = useState(
    formatLocalInputDateTime(new Date()),
  );
  const [checkState, setCheckState] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const loadGoalTags = async (id: string) => {
    const { data, error: tagsError } = await supabase
      .from("goal_tags")
      .select("tag:tags(id, name)")
      .eq("goal_id", id);

    if (tagsError) {
      setError(tagsError.message);
      return;
    }

    const loadedTags =
      data?.map(
        (item: {
          tag:
            | { id: string; name: string }
            | { id: string; name: string }[]
            | null;
        }) =>
          Array.isArray(item.tag) ? item.tag[0] ?? null : item.tag ?? null,
      )?.filter((tag): tag is { id: string; name: string } => tag !== null) ??
      [];
    setSelectedTags(loadedTags);
  };

  const handleAddTag = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { tag, error: tagError } = await ensureTag(trimmed);
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

  const loadGoal = async () => {
    if (!goalId || typeof goalId !== "string") {
      setError("Invalid goal id.");
      setGoal(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("goals")
      .select(
        "id, title, goal_type, period, target_value, target_op, start_date, end_date, context_id, is_archived, context:contexts(id, name)",
      )
      .eq("id", goalId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setGoal(null);
      setIsLoading(false);
      return;
    }

    const rawGoal = data as GoalDetails & {
      context:
        | { id: string; name: string }
        | { id: string; name: string }[]
        | null;
    };
    const loadedGoal: GoalDetails = {
      ...rawGoal,
      context: Array.isArray(rawGoal.context)
        ? (rawGoal.context[0] ?? null)
        : (rawGoal.context ?? null),
    };
    setGoal(loadedGoal);
    setEditTitle(loadedGoal.title);
    setEditEndDate(loadedGoal.end_date);
    await loadGoalTags(loadedGoal.id);
    setIsLoading(false);
  };

  const loadEvents = async (goalData: GoalDetails) => {
    const [time, counter, check] = await Promise.all([
      goalData.goal_type === "time"
        ? supabase
            .from("time_entries")
            .select("id, started_at, ended_at")
            .eq("goal_id", goalData.id)
            .order("started_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      goalData.goal_type === "counter"
        ? supabase
            .from("counter_events")
            .select("id, occurred_at, value_delta")
            .eq("goal_id", goalData.id)
            .order("occurred_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      goalData.goal_type === "check"
        ? supabase
            .from("check_events")
            .select("id, occurred_at, state")
            .eq("goal_id", goalData.id)
            .order("occurred_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (time.error || counter.error || check.error) {
      setError(
        time.error?.message ||
          counter.error?.message ||
          check.error?.message ||
          null,
      );
      return;
    }

    setTimeEntries((time.data as TimeEntry[]) ?? []);
    setCounterEvents((counter.data as CounterEvent[]) ?? []);
    setCheckEvents((check.data as CheckEvent[]) ?? []);
  };

  const loadProgress = async (goalData: GoalDetails) => {
    const { start, end } = getPeriodBounds(goalData.period);
    if (goalData.goal_type === "time") {
      const { data, error: timeError } = await supabase
        .from("time_entries")
        .select("id, started_at, ended_at")
        .eq("goal_id", goalData.id)
        .lt("started_at", end.toISOString())
        .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`);

      if (timeError) {
        setProgress(null);
        return;
      }

      const minutes = calculateTimeMinutes(
        (data ?? []) as TimeEntry[],
        start,
        end,
      );
      setProgress({ label: "Minutes this period", value: minutes });
      return;
    }

    if (goalData.goal_type === "counter") {
      const { data, error: counterError } = await supabase
        .from("counter_events")
        .select("value_delta, occurred_at")
        .eq("goal_id", goalData.id)
        .gte("occurred_at", start.toISOString())
        .lt("occurred_at", end.toISOString());

      if (counterError) {
        setProgress(null);
        return;
      }

      const total = (data ?? []).reduce(
        (sum, event) => sum + (event.value_delta ?? 0),
        0,
      );
      setProgress({ label: "Count this period", value: total });
      return;
    }

    if (goalData.goal_type === "check") {
      const { data, error: checkError } = await supabase
        .from("check_events")
        .select("state, occurred_at")
        .eq("goal_id", goalData.id)
        .gte("occurred_at", start.toISOString())
        .lt("occurred_at", end.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(1);

      if (checkError) {
        setProgress(null);
        return;
      }

      const state = data?.[0]?.state ? 1 : 0;
      setProgress({ label: "Check state", value: state });
    }
  };

  useEffect(() => {
    void loadGoal();
  }, [goalId]);

  useEffect(() => {
    if (!goal) return;
    void loadEvents(goal);
    void loadProgress(goal);
  }, [goal]);

  const handleAddTimeEntry = async () => {
    if (!goal) return;

    const start = new Date(timeStart);
    const end = new Date(timeEnd);
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setIsSubmitting(false);
      return;
    }
    if (!userId) {
      setError("Please log in to add events.");
      setIsSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("time_entries").insert({
      user_id: userId,
      goal_id: goal.id,
      context_id: goal.context_id,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      await loadEvents(goal);
      await loadProgress(goal);
      await recalcGoalPeriods(goal.id);
    }

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
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setIsSubmitting(false);
      return;
    }
    if (!userId) {
      setError("Please log in to add events.");
      setIsSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase
      .from("counter_events")
      .insert({
        user_id: userId,
        goal_id: goal.id,
        context_id: goal.context_id,
        occurred_at: new Date(counterOccurredAt).toISOString(),
        value_delta: delta,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      await loadEvents(goal);
      await loadProgress(goal);
      await recalcGoalPeriods(goal.id);
    }

    setIsSubmitting(false);
  };

  const handleAddCheckEvent = async () => {
    if (!goal) return;

    setIsSubmitting(true);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setIsSubmitting(false);
      return;
    }
    if (!userId) {
      setError("Please log in to add events.");
      setIsSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("check_events").insert({
      user_id: userId,
      goal_id: goal.id,
      context_id: goal.context_id,
      occurred_at: new Date(checkOccurredAt).toISOString(),
      state: checkState,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      await loadEvents(goal);
      await loadProgress(goal);
      await recalcGoalPeriods(goal.id);
    }

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
    setError(null);

    const { error: updateError } = await supabase
      .from("goals")
      .update({
        title: trimmedTitle,
        end_date: editEndDate,
      })
      .eq("id", goal.id);

    if (updateError) {
      setError(updateError.message);
      setIsSaving(false);
      return;
    }

    const existingIds = new Set(selectedTags.map((tag) => tag.id));
    const { data: currentTags } = await supabase
      .from("goal_tags")
      .select("tag_id")
      .eq("goal_id", goal.id);

    const currentIds = new Set(
      (currentTags ?? []).map((item: { tag_id: string }) => item.tag_id),
    );

    const toAdd = [...existingIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !existingIds.has(id));

    if (toAdd.length > 0) {
      const { error: addError } = await supabase.from("goal_tags").insert(
        toAdd.map((tagId) => ({
          goal_id: goal.id,
          tag_id: tagId,
        })),
      );
      if (addError) {
        setError(addError.message);
      }
    }

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("goal_tags")
        .delete()
        .eq("goal_id", goal.id)
        .in("tag_id", toRemove);
      if (removeError) {
        setError(removeError.message);
      }
    }

    await recalcGoalPeriods(goal.id);
    setGoal((prev) =>
      prev
        ? {
            ...prev,
            title: trimmedTitle,
            end_date: editEndDate,
          }
        : prev,
    );
    setIsSaving(false);
  };

  const handleArchiveGoal = async () => {
    if (!goal) return;
    setIsArchiving(true);
    setError(null);

    const { error: archiveError } = await supabase
      .from("goals")
      .update({ is_archived: true })
      .eq("id", goal.id);

    if (archiveError) {
      setError(archiveError.message);
      setIsArchiving(false);
      return;
    }

    await recalcGoalPeriods(goal.id);
    setIsArchiving(false);
    onArchived();
  };

  const handleDeleteEvent = async (
    type: "time" | "counter" | "check",
    id: string,
  ) => {
    if (!goal) return;
    setError(null);

    const table =
      type === "time"
        ? "time_entries"
        : type === "counter"
          ? "counter_events"
          : "check_events";

    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadEvents(goal);
    await loadProgress(goal);
    await recalcGoalPeriods(goal.id);
  };

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

  return {
    checkEvents,
    checkOccurredAt,
    checkState,
    counterDelta,
    counterEvents,
    counterOccurredAt,
    editEndDate,
    editTitle,
    error,
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
    tags,
    tagsLoading,
    timeEnd,
    timeEntries,
    timeStart,
  };
}
