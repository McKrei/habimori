"use client";

import type { TagOption } from "@/src/components/useTags";

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
}: GoalEditCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold">Edit goal</h2>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Title
        <input
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={editTitle}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        End date
        <input
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          type="date"
          min={minEndDate}
          value={editEndDate}
          onChange={(event) => onEndDateChange(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Tags
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
            list="goal-tag-options"
            placeholder="Add a tag"
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
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
            type="button"
            onClick={onTagAdd}
          >
            Add
          </button>
        </div>
        <datalist id="goal-tag-options">
          {tags.map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
        </datalist>
        {tagsLoading ? (
          <p className="mt-1 text-xs text-slate-500">Loading tags…</p>
        ) : null}
        {selectedTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag.id}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-slate-300"
                type="button"
                onClick={() => onTagRemove(tag.id)}
              >
                {tag.name} ✕
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No tags yet.</p>
        )}
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onSave}
          disabled={isSaving}
        >
          Save changes
        </button>
        <button
          className="rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-300"
          type="button"
          onClick={onArchive}
          disabled={isArchiving}
        >
          Archive goal
        </button>
      </div>
    </div>
  );
}
