"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFilter } from "@/src/components/FilterContext";
import { formatMinutesAsHHMM } from "@/src/components/formatters";
import { useTranslation } from "@/src/i18n/TranslationContext";
import StatsStackedBarChart from "@/src/components/StatsStackedBarChart";
import StatsPieChart from "@/src/components/StatsPieChart";
import FilterPanel from "@/src/components/ui/FilterPanel";
import { useStatsData } from "./useStatsData";
import { addDays, toDateInput, formatMinutesWithDays } from "./utils";

const STATUS_COLORS: Record<string, string> = {
  success: "#10b981",
  in_progress: "#f59e0b",
  fail: "#ef4444",
};

export default function StatsPage({ params }: { params: { lng: string } }) {
  const { lng: _lng } = params;
  const { t } = useTranslation();
  const { isFilterOpen, closeFilter, setActiveFilterCount } = useFilter();

  const [periodMode, setPeriodMode] = useState<"week" | "month" | "custom">("month");
  const [customStart, setCustomStart] = useState(() => toDateInput(addDays(new Date(), -6)));
  const [customEnd, setCustomEnd] = useState(() => toDateInput(new Date()));
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [chartMode, setChartMode] = useState<"contexts" | "tags">("contexts");
  const [chartVisibleIds, setChartVisibleIds] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<{ itemId: string; minutes: number } | null>(null);
  const [selectedPieSegment, setSelectedPieSegment] = useState<{ itemId: string; minutes: number } | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    if (periodMode === "week") {
      return { start: addDays(now, -6), end: now };
    }
    if (periodMode === "month") {
      return { start: addDays(now, -29), end: now };
    }
    const start = new Date(`${customStart}T00:00:00`);
    const end = new Date(`${customEnd}T00:00:00`);
    return start > end ? { start: end, end: start } : { start, end };
  }, [customEnd, customStart, periodMode]);

  const { isInitialized, processed, contexts, tags } = useStatsData(range, selectedContextIds, selectedTagIds);

  const stats = processed;
  const currentSeries = useMemo(() => stats ? (chartMode === "contexts" ? stats.contextSeries : stats.tagSeries) : [], [stats, chartMode]);
  const activeTotals = useMemo(() => stats ? (chartMode === "contexts" ? stats.contextTotals : stats.tagTotals) : [], [stats, chartMode]);
  const activeItems = chartMode === "contexts" ? contexts : tags;

  // Sync visible chart items when mode or data changes
  const prevChartModeRef = useRef(chartMode);
  useEffect(() => {
    if (!stats) return;
    const timeout = window.setTimeout(() => {
      if (prevChartModeRef.current !== chartMode) {
        prevChartModeRef.current = chartMode;
        setChartVisibleIds(currentSeries.map((item) => item.id));
        setSelectedSegment(null);
        setSelectedPieSegment(null);
        return;
      }
      if (chartVisibleIds.length === 0 && currentSeries.length > 0) {
        setChartVisibleIds(currentSeries.map((item) => item.id));
        return;
      }
      setChartVisibleIds((prev) => prev.filter((id) => currentSeries.some((item) => item.id === id)));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [currentSeries, chartVisibleIds.length, chartMode, stats]);

  const visibleSeries = useMemo(() => currentSeries.filter((item) => chartVisibleIds.includes(item.id)), [currentSeries, chartVisibleIds]);
  const totalsForVisible = useMemo(() => stats ? stats.timeTotals.map((_, index) =>
    visibleSeries.reduce((sum: number, item) => sum + (item.values[index] ?? 0), 0)
  ) : [], [stats, visibleSeries]);

  const pieSlices = useMemo(() => activeTotals
    .filter((item) => chartVisibleIds.includes(item.id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      color: item.color,
      value: item.value,
      meta: formatMinutesAsHHMM(item.value),
    })), [activeTotals, chartVisibleIds]);

  const activeFilterCount =
    (selectedContextIds.length > 0 ? 1 : 0) +
    (selectedTagIds.length > 0 ? 1 : 0) +
    (periodMode !== "month" ? 1 : 0);

  useEffect(() => {
    setActiveFilterCount(activeFilterCount);
  }, [activeFilterCount, setActiveFilterCount]);

  const handleResetFilters = () => {
    setSelectedContextIds([]);
    setSelectedTagIds([]);
    setChartVisibleIds([]);
    setSelectedSegment(null);
    setSelectedPieSegment(null);
    setPeriodMode("month");
    setCustomStart(toDateInput(addDays(new Date(), -6)));
    setCustomEnd(toDateInput(new Date()));
  };

  if (!isInitialized) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-text-secondary">
        {t("stats.loading")}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={closeFilter}
        onReset={handleResetFilters}
        hasActiveFilters={activeFilterCount > 0}
      >
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">{t("stats.period.label")}</label>
          <div className="flex flex-wrap gap-1.5">
            {[ { key: "week", label: t("stats.period.week") }, { key: "month", label: t("stats.period.month") }, { key: "custom", label: t("stats.period.custom") } ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriodMode(item.key as typeof periodMode)}
                className={`rounded-full px-2.5 py-1 text-xs transition-all ${periodMode === item.key ? "bg-accent text-surface" : "bg-surface-elevated text-text-secondary hover:bg-slate-200"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {periodMode === "custom" && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">{t("stats.dateRange")}</label>
            <div className="flex items-center gap-1.5">
              <input className="w-[120px] rounded-lg border border-border px-2 py-1.5 text-xs" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span className="text-xs text-text-faint">—</span>
              <input className="w-[120px] rounded-lg border border-border px-2 py-1.5 text-xs" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">{t("filters.context")}</label>
          <div className="flex flex-wrap gap-1.5">
            {contexts.map((context) => {
              const isSelected = selectedContextIds.includes(context.id);
              return (
                <button
                  key={context.id}
                  onClick={() => setSelectedContextIds((prev) => isSelected ? prev.filter((id) => id !== context.id) : [...prev, context.id])}
                  className={`rounded-full px-2.5 py-1 text-xs transition-all ${isSelected ? "bg-accent text-surface" : "bg-surface-elevated text-text-secondary hover:bg-slate-200"}`}
                >
                  {context.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-muted">{t("filters.tags")}</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagIds((prev) => isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                  className={`rounded-full px-2.5 py-1 text-xs transition-all ${isSelected ? "bg-accent text-surface" : "bg-surface-elevated text-text-secondary hover:bg-slate-200"}`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      </FilterPanel>

      {stats && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.success }} />
                <span className="text-lg font-semibold text-text-primary">{stats.statusSeries.success.reduce((sum: number, v: number) => sum + v, 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.in_progress }} />
                <span className="text-lg font-semibold text-text-primary">{stats.statusSeries.in_progress.reduce((sum: number, v: number) => sum + v, 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.fail }} />
                <span className="text-lg font-semibold text-text-primary">{stats.statusSeries.fail.reduce((sum: number, v: number) => sum + v, 0)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-text-muted">{t("stats.totalTime")}</span>
                <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold text-text-primary">
                  {formatMinutesWithDays(stats.totalTrackedMinutes)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-surface p-1">
              <button onClick={() => setChartMode("contexts")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${chartMode === "contexts" ? "bg-accent text-surface shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>
                {t("stats.byContexts")}
              </button>
              <button onClick={() => setChartMode("tags")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${chartMode === "tags" ? "bg-accent text-surface shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>
                {t("stats.byTags")}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{chartMode === "contexts" ? t("stats.timeByContexts") : t("stats.timeByTags")}</h2>
              <div className="flex flex-wrap gap-2">
                {visibleSeries.map((item) => (
                  <button key={item.id} onClick={() => setChartVisibleIds((prev) => prev.filter((id) => id !== item.id))} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-text-secondary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <StatsStackedBarChart
                labels={stats.timeLabels}
                series={visibleSeries}
                totals={totalsForVisible}
                formatTotal={(value) => formatMinutesAsHHMM(value)}
                onSegmentClick={(itemId, value) => setSelectedSegment({ itemId, minutes: value })}
              />
            </div>
            {selectedSegment && (
              <div className="mt-4 text-xs text-text-secondary">
                {t("stats.selected")} {activeItems.find((item) => item.id === selectedSegment.itemId)?.name ?? selectedSegment.itemId} · {formatMinutesAsHHMM(selectedSegment.minutes)}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-center">
              <h2 className="text-lg font-semibold">{chartMode === "contexts" ? t("stats.contextShare") : t("stats.tagShare")}</h2>
            </div>
            <div className="mt-4">
              {pieSlices.length === 0 ? <p className="text-sm text-text-muted">{t("stats.noTimeData")}</p> : (
                <StatsPieChart slices={pieSlices} onSliceClick={(itemId, value) => setSelectedPieSegment({ itemId, minutes: value })} />
              )}
            </div>
            {selectedPieSegment && (
              <div className="mt-4 text-xs text-text-secondary">
                {t("stats.selected")} {activeItems.find((item) => item.id === selectedPieSegment.itemId)?.name ?? selectedPieSegment.itemId} · {formatMinutesAsHHMM(selectedPieSegment.minutes)}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
