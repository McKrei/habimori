"use client";

import { useTranslation } from "@/src/i18n/TranslationContext";
import { GroupedTimeLogs } from "./types";
import { DateHeader } from "./DateHeader";
import { ContextBlock } from "./ContextBlock";

interface TimeLogsListProps {
  groupedLogs: GroupedTimeLogs;
  formatSeconds: (seconds: number) => string;
  formatTime: (iso: string) => string;
  calculateDuration: (startedAt: string, endedAt: string | null) => number;
  parseTimeToDate: (baseDate: Date, timeStr: string) => Date;
  onUpdateEntry: (entryId: string, updates: { started_at: string; ended_at: string | null }) => Promise<{ error: string | null }>;
  onUpdateEntryTags: (entryId: string, tagIds: string[]) => Promise<{ error: string | null }>;
  onDeleteEntry: (entryId: string) => Promise<{ error: string | null }>;
  onDeleteAll: (contextId: string, dateKey: string) => Promise<{ error: string | null }>;
  onToggleExpanded: (dateKey: string, contextId: string) => void;
  lng: string;
}

export function TimeLogsList({
  groupedLogs,
  formatSeconds,
  formatTime,
  calculateDuration,
  parseTimeToDate,
  onUpdateEntry,
  onUpdateEntryTags,
  onDeleteEntry,
  onDeleteAll,
  onToggleExpanded,
  lng,
}: TimeLogsListProps) {
  const { t } = useTranslation();
  const dateKeys = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  if (dateKeys.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("timeLogs.noLogs", { lng })}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 border border-slate-200 bg-white">
      {dateKeys.map((dateKey) => {
        const dayData = groupedLogs[dateKey];
        const contextEntries = Object.values(dayData.contexts);

        if (contextEntries.length === 0) return null;

        return (
          <div key={dateKey}>
            <DateHeader
              date={dayData.dateObj}
              totalSeconds={dayData.totalSeconds}
              formatSeconds={formatSeconds}
            />
            {contextEntries.map((contextData) => (
              <ContextBlock
                key={`${dateKey}-${contextData.context.id}`}
                dateKey={dateKey}
                contextData={contextData}
                formatSeconds={formatSeconds}
                formatTime={formatTime}
                calculateDuration={calculateDuration}
                parseTimeToDate={parseTimeToDate}
                onUpdateEntry={onUpdateEntry}
                onUpdateEntryTags={onUpdateEntryTags}
                onDeleteEntry={onDeleteEntry}
                onDeleteAll={onDeleteAll}
                onToggleExpanded={onToggleExpanded}
                lng={lng}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
