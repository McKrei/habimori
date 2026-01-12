"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { useFilter } from "@/src/components/FilterContext";
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
  const { isFilterOpen, closeFilter, setActiveFilterCount } = useFilter();

  const hasActiveFilters = filters.contextIds.length > 0 || filters.tagIds.length > 0;
  const activeFilterCount = (filters.contextIds.length > 0 ? 1 : 0) + (filters.tagIds.length > 0 ? 1 : 0);

  // Sync active filter count to header
  useEffect(() => {
    setActiveFilterCount(activeFilterCount);
  }, [activeFilterCount, setActiveFilterCount]);

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
    <FilterPanel
      isOpen={isFilterOpen}
      onClose={closeFilter}
      onReset={handleReset}
      hasActiveFilters={hasActiveFilters}
    >
      {/* Context Filter */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-text-muted">
          {t("filters.context")}
        </label>
        {contexts.length === 0 ? (
          <p className="text-xs text-text-faint">{t("filters.noOptions")}</p>
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
                        ? "bg-accent text-surface"
                        : "bg-surface-elevated text-text-secondary hover:bg-background"
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
        <label className="block text-xs font-medium text-text-muted">
          {t("filters.tags")}
        </label>
        {tags.length === 0 ? (
          <p className="text-xs text-text-faint">{t("filters.noTags")}</p>
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
                        ? "bg-accent text-surface"
                        : "bg-surface-elevated text-text-secondary hover:bg-background"
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
  );
}
