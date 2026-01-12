"use client";

import { useMemo, useState } from "react";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import ToastStack from "@/src/components/ToastStack";
import { useTranslation } from "@/src/i18n/TranslationContext";
import FilterIcon from "@/src/components/icons/FilterIcon";
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = selectedContext !== "" || selectedTags.length > 0 || selectedStatus !== "";
  const activeFilterCount = (selectedContext ? 1 : 0) + (selectedTags.length > 0 ? 1 : 0) + (selectedStatus ? 1 : 0);

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
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading && goals.length === 0 ? (
        <div className="rounded-lg border border-slate-100 bg-white p-4 text-sm text-slate-500">
          {t("home.loadingGoals")}
        </div>
      ) : null}

      {/* Calendar + Filter Button Row */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <HomeWeekCalendar
            selectedDate={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className={`
            relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
            border transition-all
            ${
              hasActiveFilters
                ? "border-slate-300 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }
          `}
        >
          <FilterIcon size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-medium text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
      >
        {/* Context Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            {t("filters.context")}
          </label>
          <select
            value={selectedContext}
            onChange={(e) => setSelectedContext(e.target.value)}
            className="
              w-full rounded-lg border border-slate-200 bg-white px-3 py-2
              text-sm text-slate-700 transition-colors
              focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100
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
          <label className="block text-xs font-medium text-slate-500">
            {t("filters.status")}
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="
              w-full rounded-lg border border-slate-200 bg-white px-3 py-2
              text-sm text-slate-700 transition-colors
              focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100
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
          <label className="block text-xs font-medium text-slate-500">
            {t("filters.tags")}
          </label>
          {tags.length === 0 ? (
            <p className="text-xs text-slate-400">{t("filters.noTags")}</p>
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
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
