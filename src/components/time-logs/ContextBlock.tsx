"use client";

import { useState } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { GroupedTimeLogs, TagOption } from "./types";
import { SummaryRow } from "./SummaryRow";
import { SubEntryRow } from "./SubEntryRow";
import { TagsOverflowModal } from "./TagsOverflowModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EditTagsModal } from "./EditTagsModal";

interface ContextBlockProps {
  dateKey: string;
  contextData: GroupedTimeLogs[string]["contexts"][string];
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

export function ContextBlock({
  dateKey,
  contextData,
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
}: ContextBlockProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [editingTime, setEditingTime] = useState<{
    entryId: string;
    field: "from" | "to";
    currentValue: string;
    baseDate: Date;
  } | null>(null);
  const [editingDate, setEditingDate] = useState<{
    entryId: string;
    currentDate: string;
  } | null>(null);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [editTagsEntry, setEditTagsEntry] = useState<{
    entryId: string;
    currentTags: TagOption[];
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "single" | "all";
    entryId?: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { context, entries, aggregatedTags, totalSeconds } = contextData;
  const entryCount = entries.length;

  const handleExpandToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggleExpanded(dateKey, context.id);
  };

  const handleTimeSave = async (timeStr: string) => {
    if (!editingTime || isUpdating) return;
    setIsUpdating(true);

    const { entryId, field, baseDate } = editingTime;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) {
      setEditingTime(null);
      setIsUpdating(false);
      return;
    }

    const newDate = parseTimeToDate(baseDate, timeStr);
    
    let updates: { started_at: string; ended_at: string | null };

    if (field === "from") {
      const currentTo = entry.ended_at ? new Date(entry.ended_at) : null;
      const newFromDate = new Date(newDate);
      
      if (currentTo && currentTo < newFromDate) {
        currentTo.setDate(currentTo.getDate() + 1);
      }
      
      updates = {
        started_at: newFromDate.toISOString(),
        ended_at: currentTo ? currentTo.toISOString() : entry.ended_at,
      };
    } else {
      const currentFrom = new Date(entry.started_at);
      const newToDate = new Date(newDate);
      
      if (newToDate < currentFrom) {
        newToDate.setDate(newToDate.getDate() + 1);
      }
      
      updates = {
        started_at: entry.started_at,
        ended_at: newToDate.toISOString(),
      };
    }

    await onUpdateEntry(entryId, updates);
    setEditingTime(null);
    setIsUpdating(false);
  };

  const handleDateSave = async (dateStr: string) => {
    if (!editingDate || isUpdating) return;
    setIsUpdating(true);

    const { entryId } = editingDate;
    setEditingDate(null);
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) {
      setIsUpdating(false);
      return;
    }

    const newDate = new Date(`${dateStr}T${new Date(entry.started_at).toTimeString().slice(0, 8)}`);
    const updates = { started_at: newDate.toISOString(), ended_at: entry.ended_at };

    await onUpdateEntry(entryId, updates);
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isUpdating) return;
    setIsUpdating(true);

    if (deleteConfirm.type === "all") {
      await onDeleteAll(context.id, dateKey);
    } else if (deleteConfirm.entryId) {
      await onDeleteEntry(deleteConfirm.entryId);
    }

    setDeleteConfirm(null);
    setIsUpdating(false);
  };

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const totalDuration = formatSeconds(totalSeconds);

  const showSubEntries = entryCount > 1 ? expanded : entryCount === 1;

  return (
    <>
      <div className="bg-surface/80 px-3 py-2 sm:px-5 sm:py-3">
        <SummaryRow
          context={context}
          tags={aggregatedTags}
          entryCount={entryCount}
          totalDuration={totalDuration}
          onExpandToggle={entryCount > 1 ? handleExpandToggle : undefined}
          onShowAllTags={() => setShowTagsModal(true)}
          lng={lng}
        />

        {showSubEntries && (
          <div className="mt-2 space-y-2 pl-2 sm:pl-6">
            {sortedEntries.map((entry) => (
              <SubEntryRow
                key={entry.id}
                entry={entry}
                formatTime={formatTime}
                calculateDuration={calculateDuration}
                editingTime={editingTime}
                editingDate={editingDate}
                isUpdating={isUpdating}
                onTimeClick={(field, value, baseDate) =>
                  setEditingTime({ entryId: entry.id, field, currentValue: value, baseDate })
                }
                onDateClick={(date) =>
                  setEditingDate({ entryId: entry.id, currentDate: date })
                }
                onDelete={() => setDeleteConfirm({ type: "single", entryId: entry.id })}
                onEditTags={() =>
                  setEditTagsEntry({
                    entryId: entry.id,
                    currentTags: entry.tags.map((t) => t.tag),
                  })
                }
                onTimeSave={handleTimeSave}
                onDateSave={handleDateSave}
                onTimeCancel={() => setEditingTime(null)}
                onDateCancel={() => setEditingDate(null)}
              />
            ))}
          </div>
        )}
      </div>

      {showTagsModal && (
        <TagsOverflowModal
          tags={aggregatedTags}
          onClose={() => setShowTagsModal(false)}
          lng={lng}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          title={
            deleteConfirm.type === "all"
              ? t("timeLogs.deleteAllTitle")
              : t("timeLogs.deleteEntryTitle")
          }
          message={
            deleteConfirm.type === "all"
              ? t("timeLogs.deleteAllConfirm", { count: entryCount })
              : t("timeLogs.deleteEntryConfirm")
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          lng={lng}
        />
      )}

      {editTagsEntry && (
        <EditTagsModal
          entryId={editTagsEntry.entryId}
          currentTags={editTagsEntry.currentTags}
          onSave={onUpdateEntryTags}
          onClose={() => setEditTagsEntry(null)}
        />
      )}
    </>
  );
}
