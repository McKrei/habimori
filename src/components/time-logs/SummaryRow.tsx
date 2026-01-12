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
          className={`flex h-7 w-7 items-center justify-center rounded ${
            isTimerRunning
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-slate-900 text-white hover:bg-slate-800"
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
