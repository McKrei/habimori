"use client";

import { useMemo, useState } from "react";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import ToastStack from "@/src/components/ToastStack";
import HomeEmptyState from "./HomeEmptyState";
import HomeFiltersBar from "./HomeFiltersBar";
import HomeGoalCard from "./HomeGoalCard";
import { useHomeGoalData } from "./useHomeGoalData";

export default function HomePage() {
  const {
    activeEntry,
    activeBaseSeconds,
    activeGoalId,
    checkStates,
    counterInputs,
    dismissToast,
    error,
    errorByGoal,
    goals,
    handleCheckToggle,
    handleCounterSubmit,
    handleStartTimer,
    handleStopTimer,
    isLoading,
    now,
    optimisticDeltas,
    optimisticStatus,
    pendingByGoal,
    setCounterInput,
    statusMap,
    timeOverrides,
    timeSecondsMap,
    toasts,
  } = useHomeGoalData();
  const { contexts } = useContexts();
  const { tags } = useTags();
  const [selectedContext, setSelectedContext] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  const filteredGoals = useMemo(() => {
    const statusRank: Record<string, number> = {
      success: 0,
      in_progress: 1,
      fail: 2,
      archived: 3,
    };

    return goals
      .map((goal, index) => {
        const statusEntry = statusMap[goal.id];
        const effectiveStatus =
          optimisticStatus[goal.id] ?? statusEntry?.status ?? "";
        return { goal, index, effectiveStatus };
      })
      .filter(({ goal, effectiveStatus }) => {
        const contextOk =
          selectedContext === "" || goal.context_id === selectedContext;
        const tagsOk =
          selectedTags.length === 0 ||
          goal.tags.some((tag) => selectedTags.includes(tag.id));
        const statusOk =
          selectedStatus === "" ||
          (effectiveStatus ? selectedStatus === effectiveStatus : false);
        return contextOk && tagsOk && statusOk;
      })
      .sort((a, b) => {
        const rankA = statusRank[a.effectiveStatus] ?? 4;
        const rankB = statusRank[b.effectiveStatus] ?? 4;
        if (rankA !== rankB) return rankA - rankB;
        return a.index - b.index;
      })
      .map(({ goal }) => goal);
  }, [
    goals,
    optimisticStatus,
    selectedContext,
    selectedTags,
    selectedStatus,
    statusMap,
  ]);

  const emptyState = useMemo(
    () => !isLoading && filteredGoals.length === 0,
    [filteredGoals, isLoading],
  );

  return (
    <section className="space-y-6">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading && goals.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading goals…
        </div>
      ) : null}

      <HomeFiltersBar
        contexts={contexts}
        tags={tags}
        selectedContext={selectedContext}
        selectedStatus={selectedStatus}
        selectedTags={selectedTags}
        isTagsOpen={isTagsOpen}
        onContextChange={setSelectedContext}
        onStatusChange={setSelectedStatus}
        onTagsToggle={() => setIsTagsOpen((prev) => !prev)}
        onTagToggle={(tagId) =>
          setSelectedTags((prev) =>
            prev.includes(tagId)
              ? prev.filter((id) => id !== tagId)
              : [...prev, tagId],
          )
        }
        onReset={() => {
          setSelectedContext("");
          setSelectedTags([]);
          setSelectedStatus("");
        }}
      />

      {emptyState ? <HomeEmptyState /> : null}

      <div className="grid gap-4">
        {filteredGoals.map((goal) => {
          const isActiveTimer = activeGoalId === goal.id;
          const isTimerBlocked = Boolean(activeEntry) && !isActiveTimer;
          const checkState = checkStates[goal.id] ?? false;
          const statusEntry = statusMap[goal.id];
          const optimisticDelta = optimisticDeltas[goal.id] ?? 0;
          const isPending = pendingByGoal[goal.id] ?? false;
          const hasError = errorByGoal[goal.id] ?? false;
          const counterValue = counterInputs[goal.id] ?? "";

          return (
            <HomeGoalCard
              key={goal.id}
              goal={goal}
              statusEntry={statusEntry}
              optimisticDelta={optimisticDelta}
              optimisticStatus={optimisticStatus[goal.id]}
              checkState={checkState}
              isActiveTimer={isActiveTimer}
              isTimerBlocked={isTimerBlocked}
              activeEntryStartedAt={activeEntry?.started_at ?? null}
              now={now}
              activeBaseSeconds={activeBaseSeconds}
              timeOverrides={timeOverrides}
              timeSecondsMap={timeSecondsMap}
              isPending={isPending}
              hasError={hasError}
              counterValue={counterValue}
              onCounterChange={(value) => setCounterInput(goal.id, value)}
              onCounterSubmit={() => handleCounterSubmit(goal)}
              onStartTimer={() => handleStartTimer(goal)}
              onStopTimer={() => handleStopTimer(goal)}
              onCheckToggle={(nextState) => handleCheckToggle(goal, nextState)}
            />
          );
        })}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
