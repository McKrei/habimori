"use client";

import type { GoalDetails } from "./types";
import { useTranslation } from "@/src/i18n/TranslationContext";

type GoalEntryFormsProps = {
  goal: GoalDetails;
  timeStart: string;
  timeEnd: string;
  counterDelta: string;
  counterOccurredAt: string;
  checkOccurredAt: string;
  checkState: boolean;
  isSubmitting: boolean;
  onTimeStartChange: (value: string) => void;
  onTimeEndChange: (value: string) => void;
  onCounterDeltaChange: (value: string) => void;
  onCounterOccurredAtChange: (value: string) => void;
  onCheckOccurredAtChange: (value: string) => void;
  onCheckStateChange: (value: boolean) => void;
  onAddTimeEntry: () => void;
  onAddCounterEvent: () => void;
  onAddCheckEvent: () => void;
  lng: string;
};

export default function GoalEntryForms({
  goal,
  timeStart,
  timeEnd,
  counterDelta,
  counterOccurredAt,
  checkOccurredAt,
  checkState,
  isSubmitting,
  onTimeStartChange,
  onTimeEndChange,
  onCounterDeltaChange,
  onCounterOccurredAtChange,
  onCheckOccurredAtChange,
  onCheckStateChange,
  onAddTimeEntry,
  onAddCounterEvent,
  onAddCheckEvent,
  lng: _lng,
}: GoalEntryFormsProps) {
  const { t } = useTranslation();
  return (
    <>
      {!goal.is_archived && goal.goal_type === "time" ? (
        <form
          className="rounded-lg border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onAddTimeEntry();
          }}
        >
          <h2 className="text-base font-semibold">{t("timeEntry.addTimeEntry")}</h2>
          <label className="mt-3 block text-sm font-medium text-text-secondary">
            {t("timeEntry.start")}
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              type="datetime-local"
              value={timeStart}
              onChange={(event) => onTimeStartChange(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-text-secondary">
            {t("timeEntry.end")}
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              type="datetime-local"
              value={timeEnd}
              onChange={(event) => onTimeEndChange(event.target.value)}
            />
          </label>
          <button
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {t("timeEntry.addEntry")}
          </button>
        </form>
      ) : null}

      {!goal.is_archived && goal.goal_type === "counter" ? (
        <form
          className="rounded-lg border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onAddCounterEvent();
          }}
        >
          <h2 className="text-base font-semibold">{t("counterEvent.addCounterEvent")}</h2>
          <label className="mt-3 block text-sm font-medium text-text-secondary">
            {t("counterEvent.occurredAt")}
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              type="datetime-local"
              value={counterOccurredAt}
              onChange={(event) =>
                onCounterOccurredAtChange(event.target.value)
              }
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-text-secondary">
            {t("counterEvent.delta")}
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              inputMode="numeric"
              value={counterDelta}
              onChange={(event) => onCounterDeltaChange(event.target.value)}
            />
          </label>
          <button
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {t("counterEvent.addEvent")}
          </button>
        </form>
      ) : null}

      {!goal.is_archived && goal.goal_type === "check" ? (
        <form
          className="rounded-lg border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onAddCheckEvent();
          }}
        >
          <h2 className="text-base font-semibold">{t("checkEvent.addCheckEvent")}</h2>
          <label className="mt-3 block text-sm font-medium text-text-secondary">
            {t("checkEvent.occurredAt")}
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              type="datetime-local"
              value={checkOccurredAt}
              onChange={(event) => onCheckOccurredAtChange(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-text-secondary">
            {t("checkEvent.state")}
            <select
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              value={checkState ? "done" : "not"}
              onChange={(event) =>
                onCheckStateChange(event.target.value === "done")
              }
            >
              <option value="done">{t("checkEvent.done")}</option>
              <option value="not">{t("checkEvent.notDone")}</option>
            </select>
          </label>
          <button
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {t("checkEvent.addEvent")}
          </button>
        </form>
      ) : null}
    </>
  );
}
