"use client";

import type { ContextOption } from "@/src/components/useContexts";
import type { TagOption } from "@/src/components/useTags";

type HomeFiltersBarProps = {
  contexts: ContextOption[];
  tags: TagOption[];
  selectedContext: string;
  selectedStatus: string;
  selectedTags: string[];
  isTagsOpen: boolean;
  onContextChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTagsToggle: () => void;
  onTagToggle: (tagId: string) => void;
  onReset: () => void;
};

export default function HomeFiltersBar({
  contexts,
  tags,
  selectedContext,
  selectedStatus,
  selectedTags,
  isTagsOpen,
  onContextChange,
  onStatusChange,
  onTagsToggle,
  onTagToggle,
  onReset,
}: HomeFiltersBarProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-slate-500">
          <span className="sr-only">Context</span>
          <select
            className="h-9 w-34 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
            value={selectedContext}
            onChange={(event) => onContextChange(event.target.value)}
          >
            <option value="">Context</option>
            {contexts.map((context) => (
              <option key={context.id} value={context.id}>
                {context.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-500">
          <span className="sr-only">Status</span>
          <select
            className="h-9 w-34 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
            value={selectedStatus}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="">Status</option>
            {["success", "fail", "in_progress", "archived"].map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <div className="relative">
          <button
            className="h-9 w-34 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
            type="button"
            onClick={onTagsToggle}
          >
            {selectedTags.length > 0
              ? `Selected (${selectedTags.length})`
              : "Tags"}
          </button>
          {isTagsOpen ? (
            <div className="absolute left-0 top-10 z-10 max-h-56 w-56 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              {tags.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-500">No tags</p>
              ) : (
                tags.map((tag) => {
                  const checked = selectedTags.includes(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 px-2 py-1 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onTagToggle(tag.id)}
                      />
                      {tag.name}
                    </label>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        <button
          className="w-34 h-9 rounded-md bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
          type="button"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
