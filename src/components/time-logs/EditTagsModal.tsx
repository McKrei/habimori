"use client";

import { useState } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { useTags } from "@/src/components/useTags";
import { TagOption } from "./types";
import CloseIcon from "@/src/components/icons/CloseIcon";

interface EditTagsModalProps {
  entryId: string;
  currentTags: TagOption[];
  onSave: (entryId: string, tagIds: string[]) => Promise<{ error: string | null }>;
  onClose: () => void;
}

export function EditTagsModal({
  entryId,
  currentTags,
  onSave,
  onClose,
}: EditTagsModalProps) {
  const { t } = useTranslation();
  const { tags: allTags, ensureTag, isLoading: tagsLoading } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    currentTags.map((tag) => tag.id)
  );
  const [newTagName, setNewTagName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleAddNewTag = async () => {
    if (!newTagName.trim()) return;

    const { tag, error: tagError } = await ensureTag(newTagName.trim());
    if (tagError) {
      setError(tagError);
      return;
    }

    if (tag && !selectedTagIds.includes(tag.id)) {
      setSelectedTagIds((prev) => [...prev, tag.id]);
    }
    setNewTagName("");
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleAddNewTag();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const result = await onSave(entryId, selectedTagIds);
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent/30 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">
            {t("timeLogs.editTags")}
          </h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-surface-elevated hover:text-text-secondary"
            onClick={onClose}
            type="button"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}

        {/* Add new tag */}
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder={t("tags.addTag")}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-surface hover:bg-accent-hover disabled:opacity-50"
              onClick={() => void handleAddNewTag()}
              disabled={!newTagName.trim()}
            >
              {t("common.add")}
            </button>
          </div>
        </div>

        {/* Tag list */}
        <div className="mt-4 max-h-60 overflow-y-auto">
          {tagsLoading ? (
            <p className="text-sm text-text-muted">{t("tags.loading")}</p>
          ) : allTags.length === 0 ? (
            <p className="text-sm text-text-muted">{t("tags.noTagsYet")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-all ${
                      isSelected
                        ? "bg-accent text-surface"
                        : "bg-surface-elevated text-text-secondary hover:bg-slate-200"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated"
            onClick={onClose}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover disabled:opacity-50"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
