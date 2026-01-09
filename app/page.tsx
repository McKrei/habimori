"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActiveTimer } from "@/src/components/ActiveTimerProvider";
import { getCurrentUserId } from "@/src/components/auth";
import {
  formatDate,
  formatDateTime,
  formatGoalTarget,
} from "@/src/components/formatters";

type GoalSummary = {
  id: string;
  title: string;
  goal_type: "time" | "counter" | "check";
  period: "day" | "week" | "month";
  target_value: number;
  target_op: "gte" | "lte";
  start_date: string;
  end_date: string;
  context_id: string;
  context: { id: string; name: string } | null;
};

type CheckStateMap = Record<string, boolean>;

function getTodayDateString() {
  const now = new Date();
  const localMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return localMidnight.toISOString().slice(0, 10);
}

export default function Home() {
  const { activeEntry, startTimer, stopTimer } = useActiveTimer();
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [checkStates, setCheckStates] = useState<CheckStateMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingGoalId, setWorkingGoalId] = useState<string | null>(null);
  const [openCounterGoalId, setOpenCounterGoalId] = useState<string | null>(
    null,
  );
  const [counterValue, setCounterValue] = useState("");

  const activeGoalId = activeEntry?.goal_id ?? null;

  const loadGoals = async () => {
    setIsLoading(true);
    setError(null);

    const today = getTodayDateString();
    const { data, error: fetchError } = await supabase
      .from("goals")
      .select(
        "id, title, goal_type, period, target_value, target_op, start_date, end_date, context_id, context:contexts(id, name), created_at",
      )
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const mappedGoals = (data ?? []) as GoalSummary[];
    setGoals(mappedGoals);

    const checkGoalIds = mappedGoals
      .filter((goal) => goal.goal_type === "check")
      .map((goal) => goal.id);

    if (checkGoalIds.length > 0) {
      const { data: checkEvents, error: checkError } = await supabase
        .from("check_events")
        .select("goal_id, state, occurred_at")
        .in("goal_id", checkGoalIds)
        .order("occurred_at", { ascending: false });

      if (!checkError && checkEvents) {
        const nextStates: CheckStateMap = {};
        for (const event of checkEvents) {
          if (event.goal_id && nextStates[event.goal_id] === undefined) {
            nextStates[event.goal_id] = Boolean(event.state);
          }
        }
        setCheckStates(nextStates);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadGoals();
  }, []);

  const handleCounterEvent = async (goal: GoalSummary, delta: number) => {
    if (delta <= 0 || !Number.isInteger(delta)) {
      setError("Counter value must be a positive integer.");
      return;
    }

    setWorkingGoalId(goal.id);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setWorkingGoalId(null);
      return;
    }
    if (!userId) {
      setError("Please log in to log counter events.");
      setWorkingGoalId(null);
      return;
    }
    const { error: insertError } = await supabase
      .from("counter_events")
      .insert({
        user_id: userId,
        goal_id: goal.id,
        context_id: goal.context_id,
        occurred_at: new Date().toISOString(),
        value_delta: delta,
      });

    if (insertError) {
      setError(insertError.message);
    }

    setWorkingGoalId(null);
  };

  const handleCounterSubmit = async (goal: GoalSummary) => {
    const parsed = Number.parseInt(counterValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a positive integer.");
      return;
    }
    await handleCounterEvent(goal, parsed);
    setCounterValue("");
    setOpenCounterGoalId(null);
  };

  const handleStartTimer = async (goal: GoalSummary) => {
    setWorkingGoalId(goal.id);
    setError(null);
    const { error: startError } = await startTimer({
      contextId: goal.context_id,
      goalId: goal.id,
    });
    if (startError) {
      setError(startError);
    }
    setWorkingGoalId(null);
  };

  const handleStopTimer = async () => {
    setWorkingGoalId(activeGoalId ?? "");
    setError(null);
    const { error: stopError } = await stopTimer();
    if (stopError) {
      setError(stopError);
    }
    setWorkingGoalId(null);
  };

  const handleCheckToggle = async (goal: GoalSummary, nextState: boolean) => {
    setWorkingGoalId(goal.id);
    setError(null);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setWorkingGoalId(null);
      return;
    }
    if (!userId) {
      setError("Please log in to log check events.");
      setWorkingGoalId(null);
      return;
    }
    const { error: insertError } = await supabase.from("check_events").insert({
      user_id: userId,
      goal_id: goal.id,
      context_id: goal.context_id,
      occurred_at: new Date().toISOString(),
      state: nextState,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setCheckStates((prev) => ({ ...prev, [goal.id]: nextState }));
    }

    setWorkingGoalId(null);
  };

  const emptyState = useMemo(
    () => !isLoading && goals.length === 0,
    [goals, isLoading],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Home</h1>
        <Link
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          href="/goals/new"
        >
          Add goal
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading goals…
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No active goals yet.</p>
          <Link
            className="mt-4 inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
            href="/goals/new"
          >
            Create your first goal
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4">
        {goals.map((goal) => {
          const contextLabel = goal.context?.name ?? "Unknown context";
          const isActiveTimer = activeGoalId === goal.id;
          const isTimerBlocked = Boolean(activeEntry) && !isActiveTimer;
          const isWorking = workingGoalId === goal.id;
          const checkState = checkStates[goal.id] ?? false;

          return (
            <div
              key={goal.id}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {goal.title}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {goal.goal_type} · {goal.period} · {formatGoalTarget(goal)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(goal.start_date)} → {formatDate(goal.end_date)}{" "}
                    · {contextLabel}
                  </p>
                </div>
                <Link
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  href={`/goals/${goal.id}`}
                >
                  View
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {goal.goal_type === "counter" ? (
                  <>
                    <button
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={() => handleCounterEvent(goal, 1)}
                      disabled={isWorking}
                    >
                      +1
                    </button>
                    <button
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
                      type="button"
                      onClick={() => {
                        setOpenCounterGoalId(goal.id);
                        setCounterValue("");
                      }}
                    >
                      +N
                    </button>
                    {openCounterGoalId === goal.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="w-28 rounded-md border border-slate-200 px-2 py-1 text-sm"
                          inputMode="numeric"
                          placeholder="Quantity"
                          value={counterValue}
                          onChange={(event) =>
                            setCounterValue(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void handleCounterSubmit(goal);
                            }
                            if (event.key === "Escape") {
                              setOpenCounterGoalId(null);
                              setCounterValue("");
                            }
                          }}
                        />
                        <button
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                          type="button"
                          onClick={() => handleCounterSubmit(goal)}
                        >
                          OK
                        </button>
                        <button
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
                          type="button"
                          onClick={() => {
                            setOpenCounterGoalId(null);
                            setCounterValue("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {goal.goal_type === "time" ? (
                  <>
                    {isActiveTimer ? (
                      <button
                        className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={handleStopTimer}
                        disabled={isWorking}
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        className="rounded-md border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => handleStartTimer(goal)}
                        disabled={isTimerBlocked || isWorking}
                        title={
                          isTimerBlocked
                            ? "Another timer is running"
                            : undefined
                        }
                      >
                        Play
                      </button>
                    )}
                  </>
                ) : null}

                {goal.goal_type === "check" ? (
                  <button
                    className={`rounded-md border px-4 py-1.5 text-sm font-medium ${
                      checkState
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-700"
                    }`}
                    type="button"
                    onClick={() => handleCheckToggle(goal, !checkState)}
                    disabled={isWorking}
                  >
                    {checkState ? "Done" : "Not done"}
                  </button>
                ) : null}

                {activeEntry && !isActiveTimer && goal.goal_type === "time" ? (
                  <p className="text-xs text-slate-500">
                    Timer running since {formatDateTime(activeEntry.started_at)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
