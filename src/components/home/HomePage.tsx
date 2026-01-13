"use client";

import { useEffect, useMemo, useState } from "react";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { useFilter } from "@/src/components/FilterContext";
import ToastStack from "@/src/components/ToastStack";
import { useTranslation } from "@/src/i18n/TranslationContext";
import FilterPanel from "@/src/components/ui/FilterPanel";
import HomeEmptyState from "./HomeEmptyState";
import HomeGoalCard from "./HomeGoalCard";
import HomeWeekCalendar from "./HomeWeekCalendar";
import { useHomeGoalData } from "./useHomeGoalData";

type HomePageProps = {
  lng: string;
};

export default function HomePage({ lng: _lng }: HomePageProps) {
  const { t } = useTranslation();
  const { isFilterOpen, closeFilter, setActiveFilterCount } = useFilter();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
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
  } = useHomeGoalData(selectedDate);
  const { contexts } = useContexts();
  const { tags } = useTags();
  const [selectedContext, setSelectedContext] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("");

  const hasActiveFilters = selectedContext !== "" || selectedTags.length > 0 || selectedStatus !== "";
  const activeFilterCount = (selectedContext ? 1 : 0) + (selectedTags.length > 0 ? 1 : 0) + (selectedStatus ? 1 : 0);

  // Sync active filter count to header
  useEffect(() => {
    setActiveFilterCount(activeFilterCount);
  }, [activeFilterCount, setActiveFilterCount]);

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

  const handleReset = () => {
    setSelectedContext("");
    setSelectedTags([]);
    setSelectedStatus("");
  };

  return (
    <section className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {isLoading && goals.length === 0 ? (
        <div className="rounded-lg border border-border-light bg-surface p-4 text-sm text-text-muted">
          {t("home.loadingGoals")}
        </div>
      ) : null}

      <HomeWeekCalendar
        selectedDate={selectedDate}
        onChange={setSelectedDate}
      />

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={closeFilter}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
      >
        {/* Context Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">
            {t("filters.context")}
          </label>
          <select
            value={selectedContext}
            onChange={(e) => setSelectedContext(e.target.value)}
            className="
              w-full rounded-lg border border-border bg-surface px-3 py-2
              text-sm text-text-secondary transition-colors
              focus:border-border focus:outline-none focus:ring-2 focus:ring-accent/20
            "
          >
            <option value="">{t("filters.allContexts")}</option>
            {contexts.map((context) => (
              <option key={context.id} value={context.id}>
                {context.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">
            {t("filters.status")}
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="
              w-full rounded-lg border border-border bg-surface px-3 py-2
              text-sm text-text-secondary transition-colors
              focus:border-border focus:outline-none focus:ring-2 focus:ring-accent/20
            "
          >
            <option value="">{t("filters.allStatuses")}</option>
            <option value="success">{t("status.success")}</option>
            <option value="fail">{t("status.fail")}</option>
            <option value="in_progress">{t("status.inProgress")}</option>
          </select>
        </div>

        {/* Tags Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">
            {t("filters.tags")}
          </label>
          {tags.length === 0 ? (
            <p className="text-xs text-text-faint">{t("filters.noTags")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedTags((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id]
                      )
                    }
                    className={`
                      rounded-full px-2.5 py-1 text-xs transition-all
                      ${
                        isSelected
                          ? "bg-accent text-surface"
                          : "bg-surface-elevated text-text-secondary hover:bg-surface-elevated"
                      }
                    `}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </FilterPanel>

      {emptyState ? <HomeEmptyState lng={_lng} /> : null}

      <div className="grid gap-2">
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
              lng={_lng}
            />
          );
        })}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
