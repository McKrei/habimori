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
    <div className="flex flex-nowrap items-center gap-3">
      {onExpandToggle ? (
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-xs font-semibold text-surface shadow-sm transition hover:bg-accent-hover"
          onClick={onExpandToggle}
          type="button"
        >
          {entryCount}
        </button>
      ) : (
        <div className="w-0 shrink-0" aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="min-w-0 truncate text-sm font-semibold text-text-primary">
          {context.name}
        </span>
        {tags.length > 0 && (
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
            {displayedTags.map((tag) => (
              <span
                key={tag.id}
                className="max-w-28 shrink-0 truncate rounded-full border border-border/60 bg-surface-elevated px-2.5 py-0.5 text-xs text-text-secondary"
              >
                {tag.name}
              </span>
            ))}
            {hasMoreTags && (
              <button
                className="shrink-0 rounded-full border border-dashed border-border/60 px-2 py-0.5 text-xs text-text-muted transition hover:text-text-secondary"
                onClick={onShowAllTags}
                type="button"
              >
                +{tags.length - 3}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-secondary sm:text-sm">
          {totalDuration}
        </span>

        <button
          className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm transition ${
            isTimerRunning
              ? "cursor-not-allowed bg-surface-elevated text-text-faint"
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
