"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { formatSecondsAsHHMMSS } from "@/src/components/formatters";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/src/i18n/TranslationContext";
import PlayIcon from "@/src/components/icons/PlayIcon";
import StopIcon from "@/src/components/icons/StopIcon";

export default function GlobalTimerBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
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
    const timeout = window.setTimeout(() => {
      setNow(new Date());
    }, 0);
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [activeEntry?.started_at]);

  const elapsedSeconds = activeEntry?.started_at
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(activeEntry.started_at).getTime()) / 1000,
        ),
      )
    : 0;

  const handleStart = async () => {
    setIsWorking(true);
    setError(null);
    const { context, error: contextError } = await ensureContext(contextName);

    if (contextError || !context) {
      setError(contextError ?? t("errors.contextRequired"));
      setIsWorking(false);
      return;
    }

    const { error: startError, entryId } = await startTimer({
      contextId: context.id,
    });
    if (startError || !entryId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage =
        typeof startError === "string"
          ? startError
          : t(startError!.key as any, startError!.params);
      setError(errorMessage);
      if (
        typeof startError === "object" &&
        startError.key === "errors.timerAlreadyRunning"
      ) {
        window.location.href = window.location.href;
      }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage =
        typeof stopError === "string"
          ? stopError
          : t(stopError!.key as any, stopError!.params);
      setError(errorMessage);
      if (
        typeof stopError === "object" &&
        stopError.key === "errors.timerAlreadyStopped"
      ) {
        window.location.href = window.location.href;
      }
    }
    setIsWorking(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface transition-colors">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
        <div className="text-sm text-text-secondary">
          {activeEntry ? (
            <span>
              {formatSecondsAsHHMMSS(elapsedSeconds)}
              {contextLabel ? ` · ${contextLabel}` : ""}
            </span>
          ) : (
            <span>{t("timer.noActiveTimer")}</span>
          )}
        </div>

        <div className="flex items-center justify-center">
          {activeEntry ? (
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-surface shadow-lg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              type="button"
              onClick={handleStop}
              disabled={isWorking}
            >
              <StopIcon size={28} />
            </button>
          ) : (
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-surface shadow-lg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              type="button"
              onClick={() => setIsSheetOpen(true)}
              disabled={isLoading}
            >
              <PlayIcon size={32} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-end">
          {pathname !== "/goals/new" && (
            <Link
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-surface shadow-sm hover:bg-accent-hover transition-colors"
              href="/goals/new"
            >
              {t("goalForm.addGoal")}
            </Link>
          )}
        </div>
      </div>

      {error && !isSheetOpen ? (
        <div className="mx-auto w-full max-w-5xl px-4 pb-3 text-xs font-medium text-rose-500">
          {error}
        </div>
      ) : null}

      {isSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-20">
          <div className="w-full max-w-xl rounded-2xl bg-surface p-6 shadow-xl border border-border transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {t("timer.startTimer")}
              </h2>
              <button
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                type="button"
                onClick={() => setIsSheetOpen(false)}
                disabled={isWorking}
              >
                {t("common.close")}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-text-secondary">
                {t("contexts.context")}
              </label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                list="global-context-options"
                placeholder={t("contexts.pickOrCreate")}
                value={contextName}
                onChange={(event) => setContextName(event.target.value)}
              />
              <datalist id="global-context-options">
                {contexts.map((context) => (
                  <option key={context.id} value={context.name} />
                ))}
              </datalist>
              {contextsLoading ? (
                <p className="text-xs text-text-muted">
                  {t("contexts.loading")}
                </p>
              ) : null}
              {error ? (
                <p className="text-xs font-medium text-rose-500">{error}</p>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                {t("tags.tags")}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                  list="global-tag-options"
                  placeholder={t("tags.addTag")}
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
                          setError(tagError ?? t("errors.failedToAddTag"));
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
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:border-text-faint hover:text-text-primary transition-colors"
                  type="button"
                  onClick={() => {
                    const name = tagInput.trim();
                    if (!name) return;
                    void (async () => {
                      const { tag, error: tagError } = await ensureTag(name);
                      if (tagError || !tag) {
                        setError(tagError ?? t("errors.failedToAddTag"));
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
                  {t("common.add")}
                </button>
              </div>
              <datalist id="global-tag-options">
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name} />
                ))}
              </datalist>
              {tagsLoading ? (
                <p className="text-xs text-text-muted">{t("tags.loading")}</p>
              ) : null}
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:border-text-faint transition-colors"
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
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:border-text-faint hover:text-text-primary transition-colors"
                type="button"
                onClick={() => setIsSheetOpen(false)}
                disabled={isWorking}
              >
                {t("common.cancel")}
              </button>
              <button
                className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                type="button"
                onClick={handleStart}
                disabled={isWorking || contextsLoading || tagsLoading}
              >
                <PlayIcon size={16} />
                {t("timer.startTimer")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
