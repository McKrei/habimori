"use client";

import { useTranslation } from "@/src/i18n/TranslationContext";
import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import { ContextOption, TagOption } from "./types";

interface SummaryRowProps {
  context: ContextOption;
  tags: TagOption[];
  entryCount: number;
  totalDuration: string;
  onExpandToggle?: () => void;
  onShowAllTags: () => void;
  lng: string;
}

export function SummaryRow({
  context,
  tags,
  entryCount,
  totalDuration,
  onExpandToggle,
  onShowAllTags,
}: SummaryRowProps) {
  const { t } = useTranslation();
  const { startTimer } = useActiveTimer();

  const handlePlay = async () => {
    await startTimer({ contextId: context.id });
  };

  const displayedTags = tags.slice(0, 3);
  const hasMoreTags = tags.length > 3;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="flex min-w-[1.75rem] items-center justify-center rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
        onClick={onExpandToggle}
        type="button"
        style={{ cursor: onExpandToggle ? 'pointer' : 'default' }}
      >
        {entryCount}
      </button>

      <span className="text-sm font-medium text-slate-900">{context.name}</span>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {displayedTags.map((tag) => (
            <span
              key={tag.id}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
            >
              {tag.name}
            </span>
          ))}
          {hasMoreTags && (
            <button
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={onShowAllTags}
              type="button"
            >
              +{tags.length - 3}
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-slate-600">{totalDuration}</span>

        <button
          className="flex h-7 items-center justify-center rounded bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"
          onClick={handlePlay}
          type="button"
          title={t("common.start")}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
