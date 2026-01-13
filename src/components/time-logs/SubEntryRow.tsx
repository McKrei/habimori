"use client";

import { TimeEntryWithDetails } from "./types";
import { InlineTimeEditor } from "./InlineTimeEditor";
import { InlineDatePicker } from "./InlineDatePicker";
import { EntryMenu } from "./EntryMenu";

interface SubEntryRowProps {
  entry: TimeEntryWithDetails;
  formatTime: (iso: string) => string;
  calculateDuration: (startedAt: string, endedAt: string | null) => number;
  editingTime: {
    entryId: string;
    field: "from" | "to";
    currentValue: string;
    baseDate: globalThis.Date;
  } | null;
  editingDate: {
    entryId: string;
    currentDate: string;
  } | null;
  isUpdating: boolean;
  onTimeClick: (field: "from" | "to", value: string, baseDate: globalThis.Date) => void;
  onDateClick: (date: string) => void;
  onDelete: () => void;
  onEditTags: () => void;
  onTimeSave: (value: string) => void;
  onDateSave: (value: string) => void;
  onTimeCancel: () => void;
  onDateCancel: () => void;
}

export function SubEntryRow({
  entry,
  formatTime,
  calculateDuration,
  editingTime,
  editingDate,
  isUpdating,
  onTimeClick,
  onDateClick,
  onDelete,
  onEditTags,
  onTimeSave,
  onDateSave,
  onTimeCancel,
  onDateCancel,
}: SubEntryRowProps) {
  const duration = formatDuration(calculateDuration(entry.started_at, entry.ended_at));
  const fromTime = formatTime(entry.started_at);
  const toTime = entry.ended_at ? formatTime(entry.ended_at) : "--:--";
  const dateStr = entry.started_at.split("T")[0];

  const isEditingFrom = editingTime?.entryId === entry.id && editingTime?.field === "from";
  const isEditingTo = editingTime?.entryId === entry.id && editingTime?.field === "to";
  const isEditingDate = editingDate?.entryId === entry.id;

  const handleFromClick = () => {
    if (!isUpdating) onTimeClick("from", fromTime, new Date(entry.started_at));
  };

  const handleToClick = () => {
    if (!isUpdating) onTimeClick("to", toTime, new Date(entry.ended_at || entry.started_at));
  };

  const handleDateClick = () => {
    if (!isUpdating) onDateClick(dateStr);
  };

  return (
    <div className="flex w-full flex-nowrap items-center gap-1.5 overflow-hidden rounded-xl bg-surface-elevated/70 px-2 py-1 text-xs shadow-sm sm:text-sm">
      {isEditingFrom ? (
        <InlineTimeEditor
          value={editingTime.currentValue}
          onSave={onTimeSave}
          onCancel={onTimeCancel}
        />
      ) : (
        <button
          className="min-w-[3.1rem] rounded-lg border border-border/60 bg-background px-2 py-0.5 text-left text-text-secondary hover:bg-surface"
          onClick={handleFromClick}
          type="button"
          disabled={isUpdating}
        >
          {fromTime}
        </button>
      )}
      <span className="text-text-faint">-</span>
      {isEditingTo ? (
        <InlineTimeEditor
          value={editingTime.currentValue}
          onSave={onTimeSave}
          onCancel={onTimeCancel}
        />
      ) : (
        <button
          className="min-w-[3.1rem] rounded-lg border border-border/60 bg-background px-2 py-0.5 text-left text-text-secondary hover:bg-surface"
          onClick={handleToClick}
          type="button"
          disabled={isUpdating}
        >
          {toTime}
        </button>
      )}

      {isEditingDate ? (
        <InlineDatePicker
          value={editingDate.currentDate}
          onSave={onDateSave}
          onCancel={onDateCancel}
        />
      ) : (
        <button
          className="rounded-lg border border-border/60 bg-background p-1 text-text-faint hover:text-text-secondary"
          onClick={handleDateClick}
          type="button"
          disabled={isUpdating}
          title="Change date"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      )}

      <span className="ml-auto shrink-0 text-xs text-text-muted sm:text-sm">
        {duration}
      </span>

      <EntryMenu
        onDelete={onDelete}
        onEditTags={onEditTags}
        disabled={isUpdating}
      />
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00:00";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0",
  )}:${String(secs).padStart(2, "0")}`;
}
