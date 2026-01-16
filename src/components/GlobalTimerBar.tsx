"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { formatSecondsAsHHMMSS } from "@/src/components/formatters";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/src/i18n/TranslationContext";
import PlayIcon from "@/src/components/icons/PlayIcon";
import StopIcon from "@/src/components/icons/StopIcon";
import TomatoIcon from "@/src/components/icons/TomatoIcon";
import { requestNotificationPermission } from "@/src/components/notifications";

type PomodoroSettings = {
  enabled: boolean;
  focusMinutes: number;
  breakMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
};

const pomodoroSettingsStorageKey = "pomodoro:settings";
const defaultPomodoroSettings: PomodoroSettings = {
  enabled: false,
  focusMinutes: 25,
  breakMinutes: 5,
  soundEnabled: true,
  notificationsEnabled: true,
};

const loadPomodoroSettings = (): PomodoroSettings => {
  if (typeof window === "undefined") return defaultPomodoroSettings;
  try {
    const raw = window.localStorage.getItem(pomodoroSettingsStorageKey);
    if (!raw) return defaultPomodoroSettings;
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return {
      enabled: typeof parsed.enabled === "boolean"
        ? parsed.enabled
        : defaultPomodoroSettings.enabled,
      focusMinutes:
        typeof parsed.focusMinutes === "number" && parsed.focusMinutes > 0
          ? parsed.focusMinutes
          : defaultPomodoroSettings.focusMinutes,
      breakMinutes:
        typeof parsed.breakMinutes === "number" && parsed.breakMinutes > 0
          ? parsed.breakMinutes
          : defaultPomodoroSettings.breakMinutes,
      soundEnabled: typeof parsed.soundEnabled === "boolean"
        ? parsed.soundEnabled
        : defaultPomodoroSettings.soundEnabled,
      notificationsEnabled: typeof parsed.notificationsEnabled === "boolean"
        ? parsed.notificationsEnabled
        : defaultPomodoroSettings.notificationsEnabled,
    };
  } catch {
    return defaultPomodoroSettings;
  }
};

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
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(
    () => loadPomodoroSettings().enabled,
  );
  const [pomodoroPhase, setPomodoroPhase] = useState<"focus" | "break">(
    "focus",
  );
  const [pomodoroRemaining, setPomodoroRemaining] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(
    () => loadPomodoroSettings().focusMinutes,
  );
  const [breakMinutes, setBreakMinutes] = useState(
    () => loadPomodoroSettings().breakMinutes,
  );
  const [pomodoroSoundEnabled, setPomodoroSoundEnabled] = useState(
    () => loadPomodoroSettings().soundEnabled,
  );
  const [pomodoroNotificationsEnabled, setPomodoroNotificationsEnabled] =
    useState(() => loadPomodoroSettings().notificationsEnabled);
  const [draftFocusMinutes, setDraftFocusMinutes] = useState(25);
  const [draftBreakMinutes, setDraftBreakMinutes] = useState(5);
  const [draftPomodoroSoundEnabled, setDraftPomodoroSoundEnabled] =
    useState(true);
  const [draftPomodoroNotificationsEnabled, setDraftPomodoroNotificationsEnabled] =
    useState(true);
  const pomodoroPhaseRef = useRef<"focus" | "break">("focus");
  const pomodoroSoundRef = useRef<{
    context: AudioContext;
    oscillators: OscillatorNode[];
    gainNode: GainNode;
  } | null>(null);
  const pomodoroSoundTimeoutRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string | null>(null);
  const originalIconHrefRef = useRef<string | null>(null);

  const formatTimerError = useCallback(
    (
      err?: string | { key: string; params?: Record<string, string | number> },
    ) => {
      if (!err) return "";
      if (typeof err === "string") return err;
      return t(err.key as never, err.params);
    },
    [t],
  );

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

  const stopPomodoroSound = useCallback(() => {
    if (pomodoroSoundTimeoutRef.current) {
      window.clearTimeout(pomodoroSoundTimeoutRef.current);
      pomodoroSoundTimeoutRef.current = null;
    }
    if (!pomodoroSoundRef.current) return;
    const { context, oscillators, gainNode } = pomodoroSoundRef.current;
    oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Ignore if already stopped.
      }
      oscillator.disconnect();
    });
    gainNode.disconnect();
    pomodoroSoundRef.current = null;
    void context.close();
  }, []);

  const playPomodoroSound = useCallback(() => {
    if (typeof window === "undefined") return;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;
    stopPomodoroSound();
    const audioContext = new AudioContextConstructor();
    const gainNode = audioContext.createGain();
    const nowTime = audioContext.currentTime;
    const durationSec = 2;
    const oscillators = [
      audioContext.createOscillator(),
      audioContext.createOscillator(),
    ];
    const volume = 0.06;

    oscillators[0].type = "sine";
    oscillators[0].frequency.value = 523.25;
    oscillators[1].type = "triangle";
    oscillators[1].frequency.value = 659.25;

    gainNode.gain.setValueAtTime(0, nowTime);
    gainNode.gain.linearRampToValueAtTime(volume, nowTime + 0.08);
    gainNode.gain.linearRampToValueAtTime(0, nowTime + durationSec);

    oscillators.forEach((oscillator) => {
      oscillator.connect(gainNode);
      oscillator.start(nowTime);
      oscillator.stop(nowTime + durationSec);
    });

    gainNode.connect(audioContext.destination);
    pomodoroSoundRef.current = { context: audioContext, oscillators, gainNode };
    pomodoroSoundTimeoutRef.current = window.setTimeout(() => {
      stopPomodoroSound();
    }, durationSec * 1000 + 50);
  }, [stopPomodoroSound]);

  const showPomodoroNotification = useCallback(
    async (phase: "focus" | "break") => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      const titleKey =
        phase === "focus"
          ? "timer.pomodoroFocusNotificationTitle"
          : "timer.pomodoroBreakNotificationTitle";
      const bodyKey =
        phase === "focus"
          ? "timer.pomodoroFocusNotificationBody"
          : "timer.pomodoroBreakNotificationBody";
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(t(titleKey), {
            body: t(bodyKey),
            tag: `pomodoro-${phase}`,
          });
          return;
        }
        new Notification(t(titleKey), {
          body: t(bodyKey),
        });
      } catch {
        // Ignore notification errors.
      }
    },
    [t],
  );


  const getPomodoroPhaseSeconds = useCallback(
    (phase: "focus" | "break") => {
      const minutes = phase === "focus" ? focusMinutes : breakMinutes;
      return Math.max(60, minutes * 60);
    },
    [breakMinutes, focusMinutes],
  );

  useEffect(() => {
    pomodoroPhaseRef.current = pomodoroPhase;
  }, [pomodoroPhase]);

  useEffect(() => {
    if (!activeEntry?.started_at || !pomodoroEnabled) {
      const resetTimeout = window.setTimeout(() => {
        setPomodoroRemaining(0);
      }, 0);
      return () => {
        window.clearTimeout(resetTimeout);
      };
    }

    const initTimeout = window.setTimeout(() => {
      setPomodoroRemaining((prev) =>
        prev > 0 ? prev : getPomodoroPhaseSeconds(pomodoroPhaseRef.current),
      );
    }, 0);

    const interval = window.setInterval(() => {
      setPomodoroRemaining((prev) => {
        if (prev <= 1) {
          const nextPhase =
            pomodoroPhaseRef.current === "focus" ? "break" : "focus";
          pomodoroPhaseRef.current = nextPhase;
          setPomodoroPhase(nextPhase);
          if (pomodoroNotificationsEnabled) {
            void showPomodoroNotification(nextPhase);
          }
          if (pomodoroSoundEnabled) {
            playPomodoroSound();
          }
          return getPomodoroPhaseSeconds(nextPhase);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(initTimeout);
      window.clearInterval(interval);
    };
  }, [
    activeEntry?.started_at,
    getPomodoroPhaseSeconds,
    pomodoroEnabled,
    pomodoroNotificationsEnabled,
    pomodoroSoundEnabled,
    playPomodoroSound,
    showPomodoroNotification,
  ]);

  useEffect(() => {
    return () => {
      stopPomodoroSound();
    };
  }, [stopPomodoroSound]);

  useEffect(() => {
    if (!pomodoroEnabled || !pomodoroSoundEnabled) {
      stopPomodoroSound();
    }
  }, [pomodoroEnabled, pomodoroSoundEnabled, stopPomodoroSound]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const settings: PomodoroSettings = {
      enabled: pomodoroEnabled,
      focusMinutes,
      breakMinutes,
      soundEnabled: pomodoroSoundEnabled,
      notificationsEnabled: pomodoroNotificationsEnabled,
    };
    try {
      window.localStorage.setItem(
        pomodoroSettingsStorageKey,
        JSON.stringify(settings),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    breakMinutes,
    focusMinutes,
    pomodoroEnabled,
    pomodoroNotificationsEnabled,
    pomodoroSoundEnabled,
  ]);

  const elapsedSeconds = activeEntry?.started_at
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(activeEntry.started_at).getTime()) / 1000,
        ),
      )
    : 0;

  const formatTimerTitle = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (value: number) => value.toString().padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  }, []);

  const formatPomodoroCountdown = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${pad(minutes)}:${pad(secs)}`;
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const iconLink = document.querySelector<HTMLLinkElement>(
      "link[rel~='icon']",
    );
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    if (iconLink && originalIconHrefRef.current === null) {
      originalIconHrefRef.current = iconLink.href;
    }

    if (!activeEntry?.started_at) {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
      if (iconLink && originalIconHrefRef.current) {
        iconLink.href = originalIconHrefRef.current;
      }
      return;
    }

    const baseTitle = originalTitleRef.current ?? "Habimori";
    document.title = `${formatTimerTitle(elapsedSeconds)} · ${baseTitle}`;

    if (!iconLink) return;
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(size - 12, 12, 7, 0, Math.PI * 2);
      ctx.fill();
      iconLink.href = canvas.toDataURL("image/png");
    };
    img.src = originalIconHrefRef.current ?? iconLink.href;
  }, [activeEntry?.started_at, elapsedSeconds, formatTimerTitle]);

  const handleStart = async () => {
    setIsWorking(true);
    setError(null);
    if (pomodoroEnabled && pomodoroNotificationsEnabled) {
      void requestNotificationPermission();
    }
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
      const errorMessage = formatTimerError(startError);
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

  const openPomodoroSettings = () => {
    setDraftFocusMinutes(focusMinutes);
    setDraftBreakMinutes(breakMinutes);
    setDraftPomodoroSoundEnabled(pomodoroSoundEnabled);
    setDraftPomodoroNotificationsEnabled(pomodoroNotificationsEnabled);
    setIsPomodoroOpen(true);
  };

  const handlePomodoroToggle = () => {
    const nextEnabled = !pomodoroEnabled;
    setPomodoroEnabled(nextEnabled);
    if (!nextEnabled) {
      setPomodoroRemaining(0);
      stopPomodoroSound();
      return;
    }
    if (activeEntry?.started_at) {
      setPomodoroPhase("focus");
      setPomodoroRemaining(Math.max(60, focusMinutes * 60));
    }
    if (pomodoroNotificationsEnabled) {
      void requestNotificationPermission();
    }
  };

  const handlePomodoroSave = () => {
    const nextFocus = Math.max(1, Math.floor(draftFocusMinutes));
    const nextBreak = Math.max(1, Math.floor(draftBreakMinutes));
    const durationsChanged =
      nextFocus !== focusMinutes || nextBreak !== breakMinutes;
    setFocusMinutes(nextFocus);
    setBreakMinutes(nextBreak);
    setPomodoroSoundEnabled(draftPomodoroSoundEnabled);
    setPomodoroNotificationsEnabled(draftPomodoroNotificationsEnabled);
    if (pomodoroEnabled && durationsChanged) {
      setPomodoroPhase("focus");
      setPomodoroRemaining(Math.max(60, nextFocus * 60));
    }
    if (
      draftPomodoroNotificationsEnabled &&
      !pomodoroNotificationsEnabled
    ) {
      void requestNotificationPermission();
    }
    if (!draftPomodoroSoundEnabled) {
      stopPomodoroSound();
    }
    setIsPomodoroOpen(false);
  };

  const handleStop = async () => {
    setIsWorking(true);
    setError(null);
    const endedAt = new Date().toISOString();
    const { error: stopError } = await stopTimer(endedAt);
    if (stopError) {
      const errorMessage = formatTimerError(stopError);
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
            <div className="space-y-1">
              <div>
                {formatSecondsAsHHMMSS(elapsedSeconds)}
                {contextLabel ? ` · ${contextLabel}` : ""}
              </div>
              {pomodoroEnabled && pomodoroRemaining > 0 ? (
                <div className="text-xs font-medium text-text-muted">
                  {pomodoroPhase === "focus"
                    ? t("timer.pomodoroFocusLabel")
                    : t("timer.pomodoroBreakLabel")}{" "}
                  · {formatPomodoroCountdown(pomodoroRemaining)}
                </div>
              ) : null}
            </div>
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                className={`inline-flex h-16 w-16 items-center justify-center rounded-full border transition-colors ${
                  pomodoroEnabled
                    ? "border-rose-500 text-rose-500 bg-rose-500/10"
                    : "border-border text-text-secondary hover:border-text-faint hover:text-text-primary"
                }`}
                type="button"
                onClick={handlePomodoroToggle}
                aria-label={t("timer.pomodoroToggle")}
              >
                <TomatoIcon size={20} />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:border-text-faint hover:text-text-primary transition-colors"
                type="button"
                onClick={openPomodoroSettings}
              >
                <TomatoIcon size={16} />
                {t("timer.pomodoroSettings")}
              </button>
            </div>
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

      {isPomodoroOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-20">
          <div className="w-full max-w-xl rounded-2xl bg-surface p-6 shadow-xl border border-border transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {t("timer.pomodoroSettings")}
              </h2>
              <button
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                type="button"
                onClick={() => setIsPomodoroOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm font-medium text-text-secondary">
                <span>{t("timer.pomodoroNotifications")}</span>
                <input
                  className="h-4 w-4 accent-accent"
                  type="checkbox"
                  checked={draftPomodoroNotificationsEnabled}
                  onChange={(event) =>
                    setDraftPomodoroNotificationsEnabled(event.target.checked)
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm font-medium text-text-secondary">
                <span>{t("timer.pomodoroSound")}</span>
                <input
                  className="h-4 w-4 accent-accent"
                  type="checkbox"
                  checked={draftPomodoroSoundEnabled}
                  onChange={(event) =>
                    setDraftPomodoroSoundEnabled(event.target.checked)
                  }
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-text-secondary">
                  {t("timer.pomodoroFocusMinutes")}
                  <input
                    className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                    type="number"
                    min={1}
                    value={draftFocusMinutes}
                    onChange={(event) =>
                      setDraftFocusMinutes(Number(event.target.value))
                    }
                  />
                </label>
                <label className="text-sm font-medium text-text-secondary">
                  {t("timer.pomodoroBreakMinutes")}
                  <input
                    className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                    type="number"
                    min={1}
                    value={draftBreakMinutes}
                    onChange={(event) =>
                      setDraftBreakMinutes(Number(event.target.value))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:border-text-faint hover:text-text-primary transition-colors"
                type="button"
                onClick={() => setIsPomodoroOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface hover:bg-accent-hover transition-colors"
                type="button"
                onClick={handlePomodoroSave}
              >
                {t("timer.pomodoroSave")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
