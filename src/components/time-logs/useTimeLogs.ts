"use client";

import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";
import {
  TimeEntryWithDetails,
  TimeEntryTag,
  TagOption,
  TimeLogsFilters,
  GroupedTimeLogs,
} from "./types";

const MS_IN_SECOND = 1000;
const DAYS_BACK = 7;

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DAYS_BACK);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

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
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TimeLogsFilters>({
    contextIds: [],
    tagIds: [],
  });

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { start, end } = getDateRange();
    const { userId, error: userError } = await getCurrentUserId();

    if (userError || !userId) {
      setError(userError || "User not found");
      setIsLoading(false);
      return;
    }

    const query = supabase
      .from("time_entries")
      .select(
        `
        id, started_at, ended_at, context_id, goal_id,
        context:contexts(id, name),
        time_entry_tags(tag:tags(id, name))
      `,
      )
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString())
      .order("started_at", { ascending: false });

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    const entriesWithTags: TimeEntryWithDetails[] = (data || []).map((entry) => {
      const context = Array.isArray(entry.context)
        ? entry.context[0] || null
        : entry.context;
      const tags: TimeEntryTag[] = (entry.time_entry_tags || []).map((t) => {
        const tag = Array.isArray(t.tag) ? t.tag[0] : t.tag;
        return { tag: tag as TagOption };
      });
      return {
        ...entry,
        context,
        tags,
      };
    });

    setEntries(entriesWithTags);
    setIsLoading(false);
  }, []);

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

      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const { error: deleteError } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", entryId);

      if (deleteError) {
        return { error: deleteError.message };
      }

      await refresh();
      return { error: null };
    },
    [refresh],
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

      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const toggleContextExpanded = useCallback(
    (_dateKey: string, _contextId: string) => {
      setEntries((prev) => prev);
    },
    [],
  );

  const filteredAndGrouped = useMemo(() => {
    let filtered = entries;

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
  }, [entries, filters]);

  return {
    entries,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    updateEntry,
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
