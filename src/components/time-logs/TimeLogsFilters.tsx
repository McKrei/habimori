"use client";

import { useState } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { TimeLogsFilters } from "./types";

interface TimeLogsFiltersProps {
  filters: TimeLogsFilters;
  onFiltersChange: (filters: TimeLogsFilters) => void;
}

export function TimeLogsFiltersComponent({
  filters,
  onFiltersChange,
}: TimeLogsFiltersProps) {
  const { t } = useTranslation();
  const { contexts } = useContexts();
  const { tags } = useTags();
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  const handleContextToggle = (contextId: string) => {
    onFiltersChange({
      ...filters,
      contextIds: filters.contextIds.includes(contextId)
        ? filters.contextIds.filter((id) => id !== contextId)
        : [...filters.contextIds, contextId],
    });
  };

  const handleTagToggle = (tagId: string) => {
    onFiltersChange({
      ...filters,
      tagIds: filters.tagIds.includes(tagId)
        ? filters.tagIds.filter((id) => id !== tagId)
        : [...filters.tagIds, tagId],
    });
  };

  const handleReset = () => {
    onFiltersChange({
      contextIds: [],
      tagIds: [],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <button
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
          type="button"
          onClick={() => setIsContextOpen((prev) => !prev)}
        >
          {filters.contextIds.length > 0
            ? t("contexts.contextsSelected", { count: filters.contextIds.length })
            : t("contexts.allContexts")}
        </button>
        {isContextOpen ? (
          <div className="absolute left-0 top-10 z-10 max-h-56 w-56 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
            {contexts.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-500">
                {t("stats.noContexts")}
              </p>
            ) : (
              contexts.map((context) => {
                const checked = filters.contextIds.includes(context.id);
                return (
                  <label
                    key={context.id}
                    className="flex items-center gap-2 px-2 py-1 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleContextToggle(context.id)}
                    />
                    {context.name}
                  </label>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
          type="button"
          onClick={() => setIsTagsOpen((prev) => !prev)}
        >
          {filters.tagIds.length > 0
            ? t("tags.tagsSelected", { count: filters.tagIds.length })
            : t("tags.allTags")}
        </button>
        {isTagsOpen ? (
          <div className="absolute left-0 top-10 z-10 max-h-56 w-56 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
            {tags.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-500">{t("stats.noTags")}</p>
            ) : (
              tags.map((tag) => {
                const checked = filters.tagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-1 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleTagToggle(tag.id)}
                    />
                    {tag.name}
                  </label>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {(filters.contextIds.length > 0 || filters.tagIds.length > 0) ? (
        <button
          className="h-9 rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-600 hover:bg-slate-200"
          type="button"
          onClick={handleReset}
        >
          {t("filters.reset")}
        </button>
      ) : null}
    </div>
  );
}
