"use client";

import type { TagOption } from "@/src/components/useTags";
import { useTranslation } from "@/src/i18n/TranslationContext";

type GoalEditCardProps = {
  editTitle: string;
  editEndDate: string;
  minEndDate: string;
  tagInput: string;
  tags: TagOption[];
  tagsLoading: boolean;
  selectedTags: { id: string; name: string }[];
  isSaving: boolean;
  isArchiving: boolean;
  onTitleChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onTagInputChange: (value: string) => void;
  onTagAdd: () => void;
  onTagRemove: (id: string) => void;
  onSave: () => void;
  onArchive: () => void;
  onTagSubmit: () => void;
  lng: string;
};

export default function GoalEditCard({
  editTitle,
  editEndDate,
  minEndDate,
  tagInput,
  tags,
  tagsLoading,
  selectedTags,
  isSaving,
  isArchiving,
  onTitleChange,
  onEndDateChange,
  onTagInputChange,
  onTagAdd,
  onTagRemove,
  onSave,
  onArchive,
  onTagSubmit,
  lng: _lng,
}: GoalEditCardProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">{t("goalForm.editTitle")}</h2>
      <label className="mt-3 block text-sm font-medium text-text-secondary">
        {t("goalForm.goalName")}
        <input
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          value={editTitle}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-text-secondary">
        {t("goalForm.endDate")}
        <input
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          type="date"
          min={minEndDate}
          value={editEndDate}
          onChange={(event) => onEndDateChange(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-text-secondary">
        {t("tags.tags")}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
            list="goal-tag-options"
            placeholder={t("tags.addTag")}
            value={tagInput}
            onChange={(event) => onTagInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onTagSubmit();
              }
            }}
          />
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:border-text-faint hover:text-text-primary"
            type="button"
            onClick={onTagAdd}
          >
            {t("common.add")}
          </button>
        </div>
        <datalist id="goal-tag-options">
          {tags.map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
        </datalist>
        {tagsLoading ? (
          <p className="mt-1 text-xs text-text-muted">{t("tags.loading")}</p>
        ) : null}
        {selectedTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag.id}
                className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:border-text-faint"
                type="button"
                onClick={() => onTagRemove(tag.id)}
              >
                {tag.name} ✕
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-text-muted">{t("tags.noTagsYet")}</p>
        )}
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          type="button"
          onClick={onSave}
          disabled={isSaving}
        >
          {t("goalForm.saveChanges")}
        </button>
        <button
          className="rounded-md border border-rose-500/30 px-4 py-2 text-sm font-semibold text-rose-600 hover:border-rose-500/50 transition-colors"
          type="button"
          onClick={onArchive}
          disabled={isArchiving}
        >
          {t("goalForm.archiveGoal")}
        </button>
      </div>
    </div>
  );
}
