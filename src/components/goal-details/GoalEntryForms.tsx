"use client";

import type { GoalDetails } from "./types";

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
}: GoalEntryFormsProps) {
  return (
    <>
      {!goal.is_archived && goal.goal_type === "time" ? (
        <form
          className="rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onAddTimeEntry();
          }}
        >
          <h2 className="text-base font-semibold">Add time entry</h2>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Start
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              type="datetime-local"
              value={timeStart}
              onChange={(event) => onTimeStartChange(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            End
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              type="datetime-local"
              value={timeEnd}
              onChange={(event) => onTimeEndChange(event.target.value)}
            />
          </label>
          <button
            className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            Add entry
          </button>
        </form>
      ) : null}

      {!goal.is_archived && goal.goal_type === "counter" ? (
        <form
          className="rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onAddCounterEvent();
          }}
        >
          <h2 className="text-base font-semibold">Add counter event</h2>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Occurred at
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              type="datetime-local"
              value={counterOccurredAt}
              onChange={(event) =>
                onCounterOccurredAtChange(event.target.value)
              }
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Delta
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              inputMode="numeric"
              value={counterDelta}
              onChange={(event) => onCounterDeltaChange(event.target.value)}
            />
          </label>
          <button
            className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            Add event
          </button>
        </form>
      ) : null}

      {!goal.is_archived && goal.goal_type === "check" ? (
        <form
          className="rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onAddCheckEvent();
          }}
        >
          <h2 className="text-base font-semibold">Add check event</h2>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Occurred at
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              type="datetime-local"
              value={checkOccurredAt}
              onChange={(event) => onCheckOccurredAtChange(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            State
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={checkState ? "done" : "not"}
              onChange={(event) =>
                onCheckStateChange(event.target.value === "done")
              }
            >
              <option value="done">Done</option>
              <option value="not">Not done</option>
            </select>
          </label>
          <button
            className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            Add event
          </button>
        </form>
      ) : null}
    </>
  );
}
