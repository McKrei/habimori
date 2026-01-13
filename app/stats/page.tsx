"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { useFilter } from "@/src/components/FilterContext";
import { formatMinutesAsHHMM } from "@/src/components/formatters";
import { useTranslation } from "@/src/i18n/TranslationContext";
import StatsStackedBarChart from "@/src/components/StatsStackedBarChart";
import StatsPieChart from "@/src/components/StatsPieChart";
import FilterPanel from "@/src/components/ui/FilterPanel";

const STATUS_COLORS: Record<string, string> = {
  success: "#10b981",
  in_progress: "#f59e0b",
  fail: "#ef4444",
};

const CHART_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#eab308",
  "#f43f5e",
  "#6366f1",
  "#84cc16",
  "#0f766e",
];

type GoalRow = {
  id: string;
  context_id: string;
  goal_tags?: { tag_id: string }[] | null;
};

type GoalPeriodRow = {
  goal_id: string;
  status: "success" | "fail" | "in_progress" | "archived";
  period_start: string;
};

type TimeEntryRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  context_id: string;
  time_entry_tags?: { tag_id: string }[] | null;
};

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - diff);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function listDates(start: Date, end: Date) {
  const dates: string[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toDateInput(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function formatDayLabel(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function formatRangeLabel(start: Date, end: Date) {
  const startLabel = formatDayLabel(start);
  const endLabel = formatDayLabel(end);
  if (startLabel === endLabel) {
    return startLabel;
  }
  return `${startLabel}-${endLabel}`;
}

function formatMinutesWithDays(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  if (days > 0) {
    return `${String(days).padStart(2, "0")}:${hh}:${mm}`;
  }
  return `${hh}:${mm}`;
}

export default function StatsPage({ params }: { params: { lng: string } }) {
  const { lng: _lng } = params;
  const { t } = useTranslation();
  const { contexts } = useContexts();
  const { tags } = useTags();
  const [periodMode, setPeriodMode] = useState<"week" | "month" | "custom">(
    "month",
  );
  const [customStart, setCustomStart] = useState(() =>
    toDateInput(addDays(new Date(), -6)),
  );
  const [customEnd, setCustomEnd] = useState(() => toDateInput(new Date()));
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { isFilterOpen, closeFilter, setActiveFilterCount } = useFilter();
  const [chartMode, setChartMode] = useState<"contexts" | "tags">("contexts");
  const [chartVisibleIds, setChartVisibleIds] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<{
    itemId: string;
    minutes: number;
  } | null>(null);
  const [statusSeries, setStatusSeries] = useState<{
    success: number[];
    fail: number[];
    in_progress: number[];
  }>({ success: [], fail: [], in_progress: [] });
  const [timeTotals, setTimeTotals] = useState<number[]>([]);
  const [timeLabels, setTimeLabels] = useState<string[]>([]);
  const [totalTrackedMinutes, setTotalTrackedMinutes] = useState(0);
  const [contextSeries, setContextSeries] = useState<
    { id: string; label: string; color: string; values: number[] }[]
  >([]);
  const [contextTotals, setContextTotals] = useState<
    { id: string; label: string; color: string; value: number }[]
  >([]);
  const [tagSeries, setTagSeries] = useState<
    { id: string; label: string; color: string; values: number[] }[]
  >([]);
  const [tagTotals, setTagTotals] = useState<
    { id: string; label: string; color: string; value: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    if (periodMode === "week") {
      const start = addDays(now, -6);
      const end = now;
      return { start, end };
    }
    if (periodMode === "month") {
      const start = addDays(now, -29);
      const end = now;
      return { start, end };
    }
    const startDate = customStart || toDateInput(now);
    const endDate = customEnd || toDateInput(now);
    const start = new Date(`${startDate}T00:00:00`);
    let end = new Date(`${endDate}T00:00:00`);
    if (end > now) {
      end = now;
    }
    if (start > end) {
      return { start: end, end: start };
    }
    return { start, end };
  }, [customEnd, customStart, periodMode]);

  const dateLabels = useMemo(() => listDates(range.start, range.end), [range]);

  const contextColorMap = useMemo(() => {
    const map = new Map<string, string>();
    contexts.forEach((context, index) => {
      map.set(context.id, CHART_COLORS[index % CHART_COLORS.length]);
    });
    return map;
  }, [contexts]);

  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    tags.forEach((tag, index) => {
      map.set(tag.id, CHART_COLORS[index % CHART_COLORS.length]);
    });
    return map;
  }, [tags]);

  // Sync visible chart items when mode or data changes
  const currentSeries = chartMode === "contexts" ? contextSeries : tagSeries;
  
  // Track previous mode to detect changes
  const prevChartModeRef = useRef(chartMode);
  
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      // If mode changed, reset to show all items
      if (prevChartModeRef.current !== chartMode) {
        prevChartModeRef.current = chartMode;
        setChartVisibleIds(currentSeries.map((item) => item.id));
        setSelectedSegment(null);
        return;
      }
      
      // Initialize if empty
      if (chartVisibleIds.length === 0 && currentSeries.length > 0) {
        setChartVisibleIds(currentSeries.map((item) => item.id));
        return;
      }
      
      // Filter out removed items
      setChartVisibleIds((prev) =>
        prev.filter((id) => currentSeries.some((item) => item.id === id)),
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [currentSeries, chartVisibleIds.length, chartMode]);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setError(null);

      const { data: goals, error: goalError } = await supabase
        .from("goals")
        .select("id, context_id, goal_tags(tag_id)")
        .eq("is_archived", false);

      if (goalError) {
        setError(goalError.message);
        setIsLoading(false);
        return;
      }

      const filteredGoals = (goals ?? []).filter((goal) => {
        const contextOk =
          selectedContextIds.length === 0 ||
          selectedContextIds.includes(goal.context_id);
        const goalTags = (goal as GoalRow).goal_tags ?? [];
        const tagsOk =
          selectedTagIds.length === 0 ||
          goalTags.some((tag) => selectedTagIds.includes(tag.tag_id));
        return contextOk && tagsOk;
      }) as GoalRow[];

      const goalIds = filteredGoals.map((goal) => goal.id);

      const rangeStart = new Date(`${toDateInput(range.start)}T00:00:00`);
      const rangeEndExclusive = addDays(
        new Date(`${toDateInput(range.end)}T00:00:00`),
        1,
      );

      const [goalPeriodsResult, timeEntriesResult] = await Promise.all([
        goalIds.length === 0
          ? Promise.resolve({ data: [] as GoalPeriodRow[], error: null })
          : supabase
              .from("goal_periods")
              .select("goal_id, status, period_start")
              .in("goal_id", goalIds)
              .gte("period_start", toDateInput(range.start))
              .lte("period_start", toDateInput(range.end)),
        supabase
          .from("time_entries")
          .select(
            "id, started_at, ended_at, context_id, time_entry_tags(tag_id)",
          )
          .lt("started_at", rangeEndExclusive.toISOString())
          .or(`ended_at.is.null,ended_at.gte.${rangeStart.toISOString()}`),
      ]);

      if (goalPeriodsResult.error) {
        setError(goalPeriodsResult.error.message);
        setIsLoading(false);
        return;
      }

      if (timeEntriesResult.error) {
        setError(timeEntriesResult.error.message);
        setIsLoading(false);
        return;
      }

      const goalPeriods = (goalPeriodsResult.data ?? []) as GoalPeriodRow[];
      const timeEntries = (timeEntriesResult.data ?? []) as TimeEntryRow[];

      const statusByDate: Record<
        string,
        { success: number; fail: number; in_progress: number }
      > = {};
      dateLabels.forEach((label) => {
        statusByDate[label] = { success: 0, fail: 0, in_progress: 0 };
      });

      goalPeriods.forEach((period) => {
        if (!statusByDate[period.period_start]) return;
        if (period.status === "success") {
          statusByDate[period.period_start].success += 1;
        }
        if (period.status === "fail") {
          statusByDate[period.period_start].fail += 1;
        }
        if (period.status === "in_progress") {
          statusByDate[period.period_start].in_progress += 1;
        }
      });

      const nextStatusSeries = {
        success: dateLabels.map((label) => statusByDate[label]?.success ?? 0),
        fail: dateLabels.map((label) => statusByDate[label]?.fail ?? 0),
        in_progress: dateLabels.map(
          (label) => statusByDate[label]?.in_progress ?? 0,
        ),
      };

      const filteredEntries = timeEntries.filter((entry) => {
        const contextOk =
          selectedContextIds.length === 0 ||
          selectedContextIds.includes(entry.context_id);
        const entryTags = entry.time_entry_tags ?? [];
        const tagsOk =
          selectedTagIds.length === 0 ||
          entryTags.some((tag) => selectedTagIds.includes(tag.tag_id));
        return contextOk && tagsOk;
      });

      const dayRanges = dateLabels.map((label) => {
        const start = new Date(`${label}T00:00:00`);
        return { start, end: addDays(start, 1) };
      });

      const totalsByDay = dateLabels.map(() => 0);
      const contextByDay = new Map<string, number[]>(
        contexts.map((context) => [context.id, dateLabels.map(() => 0)]),
      );
      const tagByDay = new Map<string, number[]>(
        tags.map((tag) => [tag.id, dateLabels.map(() => 0)]),
      );

      filteredEntries.forEach((entry) => {
        const entryStart = new Date(entry.started_at);
        const entryEnd = entry.ended_at ? new Date(entry.ended_at) : new Date();
        const entryTags = entry.time_entry_tags ?? [];

        dayRanges.forEach((rangeItem, index) => {
          const overlapStart =
            entryStart > rangeItem.start ? entryStart : rangeItem.start;
          const overlapEnd =
            entryEnd < rangeItem.end ? entryEnd : rangeItem.end;
          if (overlapEnd <= overlapStart) return;
          const minutes =
            (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
          totalsByDay[index] += minutes;
          
          // Context time
          const contextValues = contextByDay.get(entry.context_id);
          if (contextValues) {
            contextValues[index] += minutes;
          }
          
          // Tag time (same entry time goes to each tag)
          entryTags.forEach((entryTag) => {
            const tagValues = tagByDay.get(entryTag.tag_id);
            if (tagValues) {
              tagValues[index] += minutes;
            }
          });
        });
      });

      const totalMinutes = totalsByDay.reduce((sum, value) => sum + value, 0);
      const contextIds = contexts.map((context) => context.id);
      const tagIds = tags.map((tag) => tag.id);
      
      const dayItems = dateLabels.map((label, index) => {
        const date = new Date(`${label}T00:00:00`);
        return {
          date,
          total: totalsByDay[index],
          contextValues: contextIds.map(
            (id) => contextByDay.get(id)?.[index] ?? 0,
          ),
          tagValues: tagIds.map(
            (id) => tagByDay.get(id)?.[index] ?? 0,
          ),
        };
      });

      const nonZeroItems = dayItems.filter((item) => item.total > 0);

      const groupItems = (
        items: typeof nonZeroItems,
        mode: "day" | "week" | "month",
      ) => {
        const groups: {
          key: string;
          start: Date;
          end: Date;
          total: number;
          contextValues: number[];
          tagValues: number[];
        }[] = [];

        items.forEach((item) => {
          let key = toDateInput(item.date);
          if (mode === "week") {
            key = toDateInput(startOfWeek(item.date));
          }
          if (mode === "month") {
            key = `${item.date.getFullYear()}-${item.date.getMonth() + 1}`;
          }

          const last = groups[groups.length - 1];
          if (!last || last.key !== key) {
            groups.push({
              key,
              start: item.date,
              end: item.date,
              total: 0,
              contextValues: contextIds.map(() => 0),
              tagValues: tagIds.map(() => 0),
            });
          }
          const current = groups[groups.length - 1];
          current.end = item.date;
          current.total += item.total;
          current.contextValues = current.contextValues.map(
            (value, idx) => value + (item.contextValues[idx] ?? 0),
          );
          current.tagValues = current.tagValues.map(
            (value, idx) => value + (item.tagValues[idx] ?? 0),
          );
        });

        return groups;
      };

      let grouped = groupItems(nonZeroItems, "day");
      if (grouped.length > 10) {
        grouped = groupItems(nonZeroItems, "week");
      }
      if (grouped.length > 10) {
        grouped = groupItems(nonZeroItems, "month");
      }
      if (grouped.length > 10) {
        grouped = grouped.slice(0, 10);
      }

      const nextTimeLabels = grouped.map((group) =>
        formatRangeLabel(group.start, group.end),
      );
      const roundedTotals = grouped.map((group) => Math.round(group.total));

      // Context series
      const nextContextSeries = contextIds
        .map((id, index) => ({
          id,
          label: contexts.find((context) => context.id === id)?.name ?? id,
          color: contextColorMap.get(id) ?? "#64748b",
          values: grouped.map((group) =>
            Math.round(group.contextValues[index] ?? 0),
          ),
        }))
        .filter((item) => item.values.some((value) => value > 0));

      const nextContextTotals = nextContextSeries.map((item) => ({
        id: item.id,
        label: item.label,
        color: item.color,
        value: item.values.reduce((sum, value) => sum + value, 0),
      }));

      // Tag series
      const nextTagSeries = tagIds
        .map((id, index) => ({
          id,
          label: tags.find((tag) => tag.id === id)?.name ?? id,
          color: tagColorMap.get(id) ?? "#64748b",
          values: grouped.map((group) =>
            Math.round(group.tagValues[index] ?? 0),
          ),
        }))
        .filter((item) => item.values.some((value) => value > 0));

      const nextTagTotals = nextTagSeries.map((item) => ({
        id: item.id,
        label: item.label,
        color: item.color,
        value: item.values.reduce((sum, value) => sum + value, 0),
      }));

      setStatusSeries(nextStatusSeries);
      setTimeTotals(roundedTotals);
      setTimeLabels(nextTimeLabels);
      setContextSeries(nextContextSeries);
      setContextTotals(nextContextTotals);
      setTagSeries(nextTagSeries);
      setTagTotals(nextTagTotals);
      setTotalTrackedMinutes(totalMinutes);
      setIsLoading(false);
    };

    void loadStats();
  }, [
    contexts,
    tags,
    contextColorMap,
    tagColorMap,
    dateLabels,
    range.end,
    range.start,
    selectedContextIds,
    selectedTagIds,
  ]);

  // Select active series based on chart mode
  const activeSeries = chartMode === "contexts" ? contextSeries : tagSeries;
  const activeTotals = chartMode === "contexts" ? contextTotals : tagTotals;
  const activeItems = chartMode === "contexts" ? contexts : tags;

  const visibleSeries = activeSeries.filter((item) =>
    chartVisibleIds.includes(item.id),
  );

  const totalsForVisible = timeTotals.map((_, index) =>
    visibleSeries.reduce(
      (sum, item) => sum + (item.values[index] ?? 0),
      0,
    ),
  );
  const pieSlices = activeTotals
    .filter((item) => chartVisibleIds.includes(item.id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      color: item.color,
      value: item.value,
      meta: formatMinutesAsHHMM(item.value),
    }));

  const hasActiveFilters = selectedContextIds.length > 0 || selectedTagIds.length > 0 || periodMode !== "month";
  const activeFilterCount = 
    (selectedContextIds.length > 0 ? 1 : 0) + 
    (selectedTagIds.length > 0 ? 1 : 0) + 
    (periodMode !== "month" ? 1 : 0);

  // Sync active filter count to header
  useEffect(() => {
    setActiveFilterCount(activeFilterCount);
  }, [activeFilterCount, setActiveFilterCount]);

  const handleResetFilters = () => {
    setSelectedContextIds([]);
    setSelectedTagIds([]);
    setChartVisibleIds([]);
    setSelectedSegment(null);
    setPeriodMode("month");
    setCustomStart(toDateInput(addDays(new Date(), -6)));
    setCustomEnd(toDateInput(new Date()));
  };

  return (
    <section className="space-y-4">

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={closeFilter}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        {/* Period Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">
            {t("stats.period.label")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "week", label: t("stats.period.week") },
              { key: "month", label: t("stats.period.month") },
              { key: "custom", label: t("stats.period.custom") },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriodMode(item.key as typeof periodMode)}
                className={`
                  rounded-full px-2.5 py-1 text-xs transition-all
                  ${
                    periodMode === item.key
                      ? "bg-accent text-surface"
                      : "bg-surface-elevated text-text-secondary hover:bg-slate-200"
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        {periodMode === "custom" && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">
              {t("stats.dateRange")}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                className="w-[120px] rounded-lg border border-border px-2 py-1.5 text-xs"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="text-xs text-text-faint">—</span>
              <input
                className="w-[120px] rounded-lg border border-border px-2 py-1.5 text-xs"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Context Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">
            {t("filters.context")}
          </label>
          {contexts.length === 0 ? (
            <p className="text-xs text-text-faint">{t("filters.noOptions")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {contexts.map((context) => {
                const isSelected = selectedContextIds.includes(context.id);
                return (
                  <button
                    key={context.id}
                    type="button"
                    onClick={() =>
                      setSelectedContextIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== context.id)
                          : [...prev, context.id]
                      )
                    }
                    className={`
                      rounded-full px-2.5 py-1 text-xs transition-all
                      ${
                        isSelected
                          ? "bg-accent text-surface"
                          : "bg-surface-elevated text-text-secondary hover:bg-slate-200"
                      }
                    `}
                  >
                    {context.name}
                  </button>
                );
              })}
            </div>
          )}
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
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedTagIds((prev) =>
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
                          : "bg-surface-elevated text-text-secondary hover:bg-slate-200"
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

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-text-secondary">
          {t("stats.loading")}
        </div>
      ) : null}

      {!isLoading ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS.success }}
                />
                <span className="text-lg font-semibold text-text-primary">
                  {statusSeries.success.reduce((sum, value) => sum + value, 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS.in_progress }}
                />
                <span className="text-lg font-semibold text-text-primary">
                  {statusSeries.in_progress.reduce(
                    (sum, value) => sum + value,
                    0,
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS.fail }}
                />
                <span className="text-lg font-semibold text-text-primary">
                  {statusSeries.fail.reduce((sum, value) => sum + value, 0)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-text-muted">
                  {t("stats.totalTime")}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold text-text-primary">
                  {formatMinutesWithDays(totalTrackedMinutes)}
                </span>
              </div>
            </div>
          </div>

          {/* Chart Mode Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setChartMode("contexts")}
                className={`
                  relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200
                  ${chartMode === "contexts"
                    ? "bg-accent text-surface shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                  }
                `}
              >
                {t("stats.byContexts")}
              </button>
              <button
                type="button"
                onClick={() => setChartMode("tags")}
                className={`
                  relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200
                  ${chartMode === "tags"
                    ? "bg-accent text-surface shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                  }
                `}
              >
                {t("stats.byTags")}
              </button>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {chartMode === "contexts" ? t("stats.timeByContexts") : t("stats.timeByTags")}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleSeries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-text-secondary"
                    onClick={() =>
                      setChartVisibleIds((prev) =>
                        prev.filter((id) => id !== item.id),
                      )
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </button>
                ))}
                {visibleSeries.length === 0 ? (
                  <span className="text-xs text-text-muted">
                    {chartMode === "contexts" ? t("stats.noContextsToShow") : t("stats.noTagsToShow")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <StatsStackedBarChart
                labels={timeLabels}
                series={visibleSeries}
                totals={totalsForVisible}
                formatTotal={(value) => formatMinutesAsHHMM(value)}
                onSegmentClick={(itemId, value) =>
                  setSelectedSegment({ itemId, minutes: value })
                }
              />
            </div>

            {selectedSegment ? (
              <div className="mt-4 text-xs text-text-secondary">
                {t("stats.selected")}{" "}
                {activeItems.find((item) => item.id === selectedSegment.itemId)
                  ?.name ?? selectedSegment.itemId}{" "}
                · {formatMinutesAsHHMM(selectedSegment.minutes)}
              </div>
            ) : null}
          </div>

          {/* Pie Chart */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-center">
              <h2 className="text-lg font-semibold">
                {chartMode === "contexts" ? t("stats.contextShare") : t("stats.tagShare")}
              </h2>
            </div>
            <div className="mt-4">
              {pieSlices.length === 0 ? (
                <p className="text-sm text-text-muted">
                  {t("stats.noTimeData")}
                </p>
              ) : (
                <StatsPieChart slices={pieSlices} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
