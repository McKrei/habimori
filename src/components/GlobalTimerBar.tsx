"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { formatSecondsAsHHMMSS } from "@/src/components/formatters";

export default function GlobalTimerBar() {
  const { activeEntry, isLoading, startTimer, stopTimer } = useActiveTimer();
  const { contexts, ensureContext, isLoading: contextsLoading } = useContexts();
  const { tags, ensureTag, isLoading: tagsLoading } = useTags();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [contextName, setContextName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<
    { id: string; name: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const contextLabel = useMemo(() => {
    if (!activeEntry) return null;
    const match = contexts.find(
      (context) => context.id === activeEntry.context_id,
    );
    return match?.name ?? activeEntry.context_id.slice(0, 8);
  }, [activeEntry, contexts]);

  useEffect(() => {
    if (!activeEntry?.started_at) return;
    setNow(new Date());
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 500);
    return () => window.clearInterval(interval);
  }, [activeEntry?.started_at]);

  const elapsedSeconds = activeEntry?.started_at
    ? Math.max(
        0,
        Math.ceil(
          (now.getTime() - new Date(activeEntry.started_at).getTime()) / 1000,
        ),
      )
    : 0;

  const handleStart = async () => {
    setIsWorking(true);
    setError(null);
    const { context, error: contextError } = await ensureContext(contextName);

    if (contextError || !context) {
      setError(contextError ?? "Context is required.");
      setIsWorking(false);
      return;
    }

    const { error: startError, entryId } = await startTimer({
      contextId: context.id,
    });
    if (startError || !entryId) {
      setError(startError ?? "Failed to start timer.");
      setIsWorking(false);
      return;
    }

    if (selectedTags.length > 0) {
      const { error: tagsError } = await supabase
        .from("time_entry_tags")
        .insert(
          selectedTags.map((tag) => ({
            time_entry_id: entryId,
            tag_id: tag.id,
          })),
        );

      if (tagsError) {
        setError(tagsError.message);
      }
    }

    setContextName("");
    setTagInput("");
    setSelectedTags([]);
    setIsSheetOpen(false);
    setIsWorking(false);
  };

  const handleStop = async () => {
    setIsWorking(true);
    setError(null);
    const endedAt = new Date().toISOString();
    const { error: stopError } = await stopTimer(endedAt);
    if (stopError) {
      setError(stopError);
    }
    setIsWorking(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
        <div className="text-sm text-slate-600">
          {activeEntry ? (
            <span>
              {formatSecondsAsHHMMSS(elapsedSeconds)}
              {contextLabel ? ` · ${contextLabel}` : ""}
            </span>
          ) : (
            <span>No active timer</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          {activeEntry ? (
            <button
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleStop}
              disabled={isWorking}
            >
              Stop
            </button>
          ) : (
            <button
              className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => setIsSheetOpen(true)}
              disabled={isLoading}
            >
              Play
            </button>
          )}
        </div>

        <div className="flex items-center justify-end">
          <Link
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            href="/goals/new"
          >
            Add goal
          </Link>
        </div>
      </div>

      {error && !isSheetOpen ? (
        <div className="mx-auto w-full max-w-5xl px-4 pb-3 text-xs font-medium text-rose-600">
          {error}
        </div>
      ) : null}

      {isSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 px-4 pb-20">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Start timer</h2>
              <button
                className="text-sm text-slate-500 hover:text-slate-700"
                type="button"
                onClick={() => setIsSheetOpen(false)}
                disabled={isWorking}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Context
              </label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                list="global-context-options"
                placeholder="Pick or create a context"
                value={contextName}
                onChange={(event) => setContextName(event.target.value)}
              />
              <datalist id="global-context-options">
                {contexts.map((context) => (
                  <option key={context.id} value={context.name} />
                ))}
              </datalist>
              {contextsLoading ? (
                <p className="text-xs text-slate-500">Loading contexts…</p>
              ) : null}
              {error ? (
                <p className="text-xs font-medium text-rose-600">{error}</p>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  list="global-tag-options"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const name = tagInput.trim();
                      if (!name) return;
                      void (async () => {
                        const { tag, error: tagError } = await ensureTag(name);
                        if (tagError || !tag) {
                          setError(tagError ?? "Failed to add tag.");
                          return;
                        }
                        setSelectedTags((prev) => {
                          if (prev.some((item) => item.id === tag.id))
                            return prev;
                          return [...prev, tag];
                        });
                        setTagInput("");
                      })();
                    }
                  }}
                />
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
                  type="button"
                  onClick={() => {
                    const name = tagInput.trim();
                    if (!name) return;
                    void (async () => {
                      const { tag, error: tagError } = await ensureTag(name);
                      if (tagError || !tag) {
                        setError(tagError ?? "Failed to add tag.");
                        return;
                      }
                      setSelectedTags((prev) => {
                        if (prev.some((item) => item.id === tag.id))
                          return prev;
                        return [...prev, tag];
                      });
                      setTagInput("");
                    })();
                  }}
                >
                  Add
                </button>
              </div>
              <datalist id="global-tag-options">
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name} />
                ))}
              </datalist>
              {tagsLoading ? (
                <p className="text-xs text-slate-500">Loading tags…</p>
              ) : null}
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-slate-300"
                      type="button"
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.filter((item) => item.id !== tag.id),
                        )
                      }
                    >
                      {tag.name} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
                type="button"
                onClick={() => setIsSheetOpen(false)}
                disabled={isWorking}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={handleStart}
                disabled={isWorking || contextsLoading || tagsLoading}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
