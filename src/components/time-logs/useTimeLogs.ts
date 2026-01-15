"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useAppStore,
  useStoreSelector,
  AppState,
  deleteEvent as storeDeleteEvent,
  initializeStore,
  Tag
} from "@/src/store";
import { supabase } from "@/lib/supabase/client";
import {
  TimeEntryWithDetails,
  TimeEntryTag,
  TagOption,
  TimeLogsFilters,
  GroupedTimeLogs,
} from "./types";

const MS_IN_SECOND = 1000;

function getISODateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function formatSecondsAsHHMMSS(seconds: number): string {
  if (!Number.isFinite(seconds)) return "--:--:--";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0",
  )}:${String(secs).padStart(2, "0")}`;
}

function formatTimeFromISO(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseTimeToDate(baseDate: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function calculateDurationSeconds(
  startedAt: string,
  endedAt: string | null,
): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / MS_IN_SECOND));
}

function groupTimeEntries(
  entries: TimeEntryWithDetails[],
): GroupedTimeLogs {
  const grouped: GroupedTimeLogs = {};

  for (const entry of entries) {
    const entryDate = parseISODate(getISODateOnly(new Date(entry.started_at)));
    const dateKey = getISODateOnly(entryDate);

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        dateObj: entryDate,
        totalSeconds: 0,
        contexts: {},
      };
    }

    const contextId = entry.context_id;
    const context = entry.context;

    if (!grouped[dateKey].contexts[contextId]) {
      grouped[dateKey].contexts[contextId] = {
        context: context || { id: contextId, name: "Unknown" },
        entries: [],
        aggregatedTags: [],
        totalSeconds: 0,
        expanded: false,
      };
    }

    grouped[dateKey].contexts[contextId].entries.push(entry);

    const duration = calculateDurationSeconds(
      entry.started_at,
      entry.ended_at,
    );
    grouped[dateKey].contexts[contextId].totalSeconds += duration;
    grouped[dateKey].totalSeconds += duration;

    if (entry.tags) {
      for (const tagRef of entry.tags) {
        const existingTag = grouped[dateKey].contexts[contextId].aggregatedTags.find(
          (t) => t.id === tagRef.tag.id,
        );
        if (!existingTag) {
          grouped[dateKey].contexts[contextId].aggregatedTags.push(tagRef.tag);
        }
      }
    }
  }

  return grouped;
}

export function useTimeLogs() {
  const store = useAppStore();
  const [filters, setFilters] = useState<TimeLogsFilters>({
    contextIds: [],
    tagIds: [],
  });

  const isLoading = useStoreSelector((state: AppState) => !state.isInitialized);
  const error = useStoreSelector((state: AppState) => state.loadError);

  // -- Store Data Mapping --
  const entriesRaw = useStoreSelector((state: AppState) => state.timeEntries);
  const contextsRaw = useStoreSelector((state: AppState) => state.contexts);
  const tagsRaw = useStoreSelector((state: AppState) => state.tags);

  const entriesWithDetails = useMemo(() => {
    const contextMap = new Map(contextsRaw.map(c => [c.id, c]));
    const tagMap = new Map(tagsRaw.map(t => [t.id, t]));

    return entriesRaw.map(entry => {
      const context = contextMap.get(entry.context_id) || null;
      const tags: TimeEntryTag[] = (entry.tag_ids || [])
        .map(tagId => tagMap.get(tagId))
        .filter((t): t is Tag => !!t)
        .map(t => ({ tag: t as TagOption }));

      return {
        ...entry,
        context,
        tags
      } as TimeEntryWithDetails;
    });
  }, [entriesRaw, contextsRaw, tagsRaw]);

  const refresh = useCallback(async () => {
    void initializeStore(store);
  }, [store]);

  const updateEntry = useCallback(
    async (
      entryId: string,
      updates: Partial<{ started_at: string; ended_at: string | null }>,
    ) => {
      const { error: updateError } = await supabase
        .from("time_entries")
        .update(updates)
        .eq("id", entryId);

      if (updateError) {
        return { error: updateError.message };
      }

      // Optimistically update store
      store.dispatch({
        type: "UPDATE_TIME_ENTRY", entryId, updates: {
          started_at: updates.started_at,
          ended_at: updates.ended_at ?? null
        }
      });

      return { error: null };
    },
    [store],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const { error: err } = await storeDeleteEvent(store, "time", entryId);
      return { error: err };
    },
    [store],
  );

  const deleteEntriesByContextAndDate = useCallback(
    async (contextId: string, dateStr: string) => {
      const dateStart = new Date(`${dateStr}T00:00:00`);
      const dateEnd = new Date(`${dateStr}T23:59:59`);

      const { error: deleteError } = await supabase
        .from("time_entries")
        .delete()
        .eq("context_id", contextId)
        .gte("started_at", dateStart.toISOString())
        .lte("started_at", dateEnd.toISOString());

      if (deleteError) {
        return { error: deleteError.message };
      }

      // We don't have a bulk delete action in store, but we can refetch or manually remove
      // For now, let's just refetch
      void refresh();
      return { error: null };
    },
    [refresh],
  );

  const updateEntryTags = useCallback(
    async (entryId: string, tagIds: string[]) => {
      // Delete existing tags
      const { error: deleteError } = await supabase
        .from("time_entry_tags")
        .delete()
        .eq("time_entry_id", entryId);

      if (deleteError) {
        return { error: deleteError.message };
      }

      // Insert new tags
      if (tagIds.length > 0) {
        const tagInserts = tagIds.map((tagId) => ({
          time_entry_id: entryId,
          tag_id: tagId,
        }));
        const { error: insertError } = await supabase
          .from("time_entry_tags")
          .insert(tagInserts);

        if (insertError) {
          return { error: insertError.message };
        }
      }

      // Update store
      store.dispatch({ type: "UPDATE_TIME_ENTRY", entryId, updates: { tag_ids: tagIds } });
      return { error: null };
    },
    [store],
  );

  const toggleContextExpanded = useCallback(
    (_dateKey: string, _contextId: string) => {
      // Local state expansion is usually handled in the UI component
      // but the original hook had this as a no-op that triggered re-render via setEntries
    },
    [],
  );

  const filteredAndGrouped = useMemo(() => {
    let filtered = entriesWithDetails;

    if (filters.contextIds.length > 0) {
      filtered = filtered.filter((e) =>
        filters.contextIds.includes(e.context_id),
      );
    }

    if (filters.tagIds.length > 0) {
      filtered = filtered.filter((e) =>
        e.tags?.some((t) => filters.tagIds.includes(t.tag.id)),
      );
    }

    return groupTimeEntries(filtered);
  }, [entriesWithDetails, filters]);

  return {
    entries: entriesWithDetails,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    updateEntry,
    updateEntryTags,
    deleteEntry,
    deleteEntriesByContextAndDate,
    toggleContextExpanded,
    groupedLogs: filteredAndGrouped,
    formatSecondsAsHHMMSS,
    formatTimeFromISO,
    calculateDurationSeconds,
    parseTimeToDate,
  };
}
