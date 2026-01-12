"use client";

import { useState } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import FilterIcon from "@/src/components/icons/FilterIcon";
import FilterPanel from "@/src/components/ui/FilterPanel";
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = filters.contextIds.length > 0 || filters.tagIds.length > 0;
  const activeFilterCount = (filters.contextIds.length > 0 ? 1 : 0) + (filters.tagIds.length > 0 ? 1 : 0);

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
    <>
      <button
        onClick={() => setIsFilterOpen(true)}
        className={`
          relative flex h-9 items-center gap-2 rounded-lg border px-3 transition-all
          ${
            hasActiveFilters
              ? "border-slate-300 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }
        `}
      >
        <FilterIcon size={16} />
        <span className="text-sm">{t("filters.title")}</span>
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-medium text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
      >
        {/* Context Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            {t("filters.context")}
          </label>
          {contexts.length === 0 ? (
            <p className="text-xs text-slate-400">{t("filters.noOptions")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {contexts.map((context) => {
                const isSelected = filters.contextIds.includes(context.id);
                return (
                  <button
                    key={context.id}
                    type="button"
                    onClick={() => handleContextToggle(context.id)}
                    className={`
                      rounded-full px-2.5 py-1 text-xs transition-all
                      ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }
                    `}
                  >
                    {context.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            {t("filters.tags")}
          </label>
          {tags.length === 0 ? (
            <p className="text-xs text-slate-400">{t("filters.noTags")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const isSelected = filters.tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`
                      rounded-full px-2.5 py-1 text-xs transition-all
                      ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }
                    `}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </FilterPanel>
    </>
  );
}
