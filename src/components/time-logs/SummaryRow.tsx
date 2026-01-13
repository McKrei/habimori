"use client";

import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import PlayIcon from "@/src/components/icons/PlayIcon";
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
  const { activeEntry, startTimer } = useActiveTimer();

  const isTimerRunning = Boolean(activeEntry);

  const handlePlay = async () => {
    if (isTimerRunning) return;
    await startTimer({
      contextId: context.id,
      tagIds: tags.map((tag) => tag.id),
    });
  };

  const displayedTags = tags.slice(0, 3);
  const hasMoreTags = tags.length > 3;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onExpandToggle ? (
        <button
          className="flex min-w-[1.75rem] items-center justify-center rounded bg-accent px-2 py-1 text-xs font-medium text-surface"
          onClick={onExpandToggle}
          type="button"
        >
          {entryCount}
        </button>
      ) : (
        <div className="h-6 min-w-[1.75rem] px-2 py-1" aria-hidden />
      )}

      <span className="text-sm font-medium text-text-primary">{context.name}</span>

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
              className="text-xs text-text-muted hover:text-text-secondary"
              onClick={onShowAllTags}
              type="button"
            >
              +{tags.length - 3}
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-text-secondary">{totalDuration}</span>

        <button
          className={`flex h-7 w-7 items-center justify-center rounded ${
            isTimerRunning
              ? "bg-slate-200 text-text-faint cursor-not-allowed"
              : "bg-accent text-surface hover:bg-accent-hover"
          }`}
          onClick={handlePlay}
          type="button"
          disabled={isTimerRunning}
        >
          <PlayIcon size={14} />
        </button>
      </div>
    </div>
  );
}
