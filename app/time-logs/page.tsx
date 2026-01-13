"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { useTimeLogs } from "@/src/components/time-logs/useTimeLogs";
import { TimeLogsFiltersComponent } from "@/src/components/time-logs/TimeLogsFilters";
import { TimeLogsList } from "@/src/components/time-logs/TimeLogsList";
import { DEFAULT_LANGUAGE } from "@/src/i18n/config";

export default function TimeLogsPage() {
  const { t, language } = useTranslation();
  const {
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    groupedLogs,
    formatSecondsAsHHMMSS,
    formatTimeFromISO,
    calculateDurationSeconds,
    parseTimeToDate,
    updateEntry,
    updateEntryTags,
    deleteEntry,
    deleteEntriesByContextAndDate,
  } = useTimeLogs();

  const lng = language || DEFAULT_LANGUAGE;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleUpdateEntry = async (
    entryId: string,
    updates: { started_at: string; ended_at: string | null },
  ) => {
    const result = await updateEntry(entryId, updates);
    if (result.error) {
      console.error("Failed to update entry:", result.error);
    }
    return result;
  };

  const handleUpdateEntryTags = async (entryId: string, tagIds: string[]) => {
    const result = await updateEntryTags(entryId, tagIds);
    if (result.error) {
      console.error("Failed to update entry tags:", result.error);
    }
    return result;
  };

  const handleDeleteEntry = async (entryId: string) => {
    const result = await deleteEntry(entryId);
    if (result.error) {
      console.error("Failed to delete entry:", result.error);
    }
    return result;
  };

  const handleDeleteAll = async (contextId: string, dateKey: string) => {
    const result = await deleteEntriesByContextAndDate(contextId, dateKey);
    if (result.error) {
      console.error("Failed to delete entries:", result.error);
    }
    return result;
  };

  const handleToggleExpanded = () => {
    // State is managed locally in ContextBlock
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">
          {t("timeLogs.title")}
        </h1>
      </div>

      <TimeLogsFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
      />

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 shadow-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-text-muted shadow-sm">
          {t("timeLogs.loading")}
        </div>
      ) : (
        <TimeLogsList
          groupedLogs={groupedLogs}
          formatSeconds={formatSecondsAsHHMMSS}
          formatTime={formatTimeFromISO}
          calculateDuration={calculateDurationSeconds}
          parseTimeToDate={parseTimeToDate}
          onUpdateEntry={handleUpdateEntry}
          onUpdateEntryTags={handleUpdateEntryTags}
          onDeleteEntry={handleDeleteEntry}
          onDeleteAll={handleDeleteAll}
          onToggleExpanded={handleToggleExpanded}
          lng={lng}
        />
      )}
    </div>
  );
}
