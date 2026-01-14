"use client";

import { useMemo } from "react";
import { useStoreSelector, AppState } from "@/src/store";
import { addDays, toDateInput, startOfWeek, listDates, formatRangeLabel } from "./utils";

export const CHART_COLORS = [
    "#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#14b8a6",
    "#eab308", "#f43f5e", "#6366f1", "#84cc16", "#0f766e",
];

interface GroupedItem {
    key: string;
    start: Date;
    end: Date;
    total: number;
    contextValues: number[];
    tagValues: number[];
}

export function useStatsData(
    range: { start: Date; end: Date },
    selectedContextIds: string[],
    selectedTagIds: string[]
) {
    const dateLabels = useMemo(() => listDates(range.start, range.end), [range]);

    const goals = useStoreSelector((state: AppState) => state.goals);
    const contextsRaw = useStoreSelector((state: AppState) => state.contexts);
    const tagsRaw = useStoreSelector((state: AppState) => state.tags);
    const timeEntries = useStoreSelector((state: AppState) => state.timeEntries);
    const goalPeriods = useStoreSelector((state: AppState) => state.goalPeriods);
    const isInitialized = useStoreSelector((state: AppState) => state.isInitialized);

    const contextColorMap = useMemo(() => {
        const map = new Map<string, string>();
        contextsRaw.forEach((context, index) => {
            map.set(context.id, CHART_COLORS[index % CHART_COLORS.length]);
        });
        return map;
    }, [contextsRaw]);

    const tagColorMap = useMemo(() => {
        const map = new Map<string, string>();
        tagsRaw.forEach((tag, index) => {
            map.set(tag.id, CHART_COLORS[index % CHART_COLORS.length]);
        });
        return map;
    }, [tagsRaw]);

    const processed = useMemo(() => {
        if (!isInitialized) return null;

        // 1. Filter goals
        const filteredGoals = goals.filter((goal) => {
            const contextOk =
                selectedContextIds.length === 0 ||
                selectedContextIds.includes(goal.context_id);
            const tagsOk =
                selectedTagIds.length === 0 ||
                goal.tags.some((tag) => selectedTagIds.includes(tag.id));
            return contextOk && tagsOk && !goal.is_archived;
        });

        const goalIds = new Set(filteredGoals.map((g) => g.id));

        // 2. Status Series
        const statusByDate: Record<
            string,
            { success: number; fail: number; in_progress: number }
        > = {};
        dateLabels.forEach((label: string) => {
            statusByDate[label] = { success: 0, fail: 0, in_progress: 0 };
        });

        goalPeriods.forEach((period) => {
            if (!goalIds.has(period.goal_id)) return;
            if (!statusByDate[period.period_start]) return;
            if (period.status === "success") statusByDate[period.period_start].success += 1;
            if (period.status === "fail") statusByDate[period.period_start].fail += 1;
            if (period.status === "in_progress") statusByDate[period.period_start].in_progress += 1;
        });

        const statusSeries = {
            success: dateLabels.map((label: string) => statusByDate[label]?.success ?? 0),
            fail: dateLabels.map((label: string) => statusByDate[label]?.fail ?? 0),
            in_progress: dateLabels.map((label: string) => statusByDate[label]?.in_progress ?? 0),
        };

        // 3. Time Series
        const filteredEntries = timeEntries.filter((entry) => {
            const contextOk = selectedContextIds.length === 0 || selectedContextIds.includes(entry.context_id);
            const tagsOk = selectedTagIds.length === 0 || entry.tag_ids.some((tid) => selectedTagIds.includes(tid));
            return contextOk && tagsOk;
        });

        const dayRanges = dateLabels.map((label: string) => {
            const start = new Date(`${label}T00:00:00`);
            return { start, end: addDays(start, 1) };
        });

        const totalsByDay = dateLabels.map(() => 0);
        const contextByDay = new Map<string, number[]>(contextsRaw.map((c) => [c.id, dateLabels.map(() => 0)]));
        const tagByDay = new Map<string, number[]>(tagsRaw.map((t) => [t.id, dateLabels.map(() => 0)]));

        filteredEntries.forEach((entry) => {
            const entryStart = new Date(entry.started_at);
            const entryEnd = entry.ended_at ? new Date(entry.ended_at) : new Date();

            dayRanges.forEach((rangeItem: { start: Date; end: Date }, index: number) => {
                const overlapStart = entryStart > rangeItem.start ? entryStart : rangeItem.start;
                const overlapEnd = entryEnd < rangeItem.end ? entryEnd : rangeItem.end;
                if (overlapEnd <= overlapStart) return;

                const minutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
                totalsByDay[index] += minutes;

                const cv = contextByDay.get(entry.context_id);
                if (cv) cv[index] += minutes;

                entry.tag_ids.forEach((tid) => {
                    const tv = tagByDay.get(tid);
                    if (tv) tv[index] += minutes;
                });
            });
        });

        const totalTrackedMinutes = totalsByDay.reduce((sum: number, v: number) => sum + v, 0);

        // Grouping for chart labels
        const dayItems = dateLabels.map((label: string, index: number) => ({
            date: new Date(`${label}T00:00:00`),
            total: totalsByDay[index],
            contextValues: contextsRaw.map(c => contextByDay.get(c.id)?.[index] ?? 0),
            tagValues: tagsRaw.map(t => tagByDay.get(t.id)?.[index] ?? 0)
        }));

        const nonZeroItems = dayItems.filter((item) => item.total > 0);

        const groupItems = (items: typeof nonZeroItems, mode: "day" | "week" | "month") => {
            const groups: GroupedItem[] = [];
            items.forEach((item) => {
                let key = toDateInput(item.date);
                if (mode === "week") key = toDateInput(startOfWeek(item.date));
                if (mode === "month") key = `${item.date.getFullYear()}-${item.date.getMonth() + 1}`;

                const last = groups[groups.length - 1];
                if (!last || last.key !== key) {
                    groups.push({
                        key, start: item.date, end: item.date, total: 0,
                        contextValues: contextsRaw.map(() => 0),
                        tagValues: tagsRaw.map(() => 0)
                    });
                }
                const current = groups[groups.length - 1];
                current.end = item.date;
                current.total += item.total;
                current.contextValues = current.contextValues.map((v: number, i: number) => v + item.contextValues[i]);
                current.tagValues = current.tagValues.map((v: number, i: number) => v + item.tagValues[i]);
            });
            return groups;
        };

        let grouped = groupItems(nonZeroItems, "day");
        if (grouped.length > 10) grouped = groupItems(nonZeroItems, "week");
        if (grouped.length > 10) grouped = groupItems(nonZeroItems, "month");
        if (grouped.length > 10) grouped = grouped.slice(0, 10);

        const timeLabels = grouped.map((group) => formatRangeLabel(group.start, group.end));
        const roundedTimeTotals = grouped.map((group) => Math.round(group.total));

        const contextSeries = contextsRaw.map((c, index) => ({
            id: c.id,
            label: c.name,
            color: contextColorMap.get(c.id) ?? "#64748b",
            values: grouped.map(g => Math.round(g.contextValues[index] ?? 0))
        })).filter(s => s.values.some(v => v > 0));

        const contextTotals = contextSeries.map(s => ({
            id: s.id, label: s.label, color: s.color,
            value: s.values.reduce((sum, v) => sum + v, 0)
        }));

        const tagSeries = tagsRaw.map((t, index) => ({
            id: t.id,
            label: t.name,
            color: tagColorMap.get(t.id) ?? "#64748b",
            values: grouped.map(g => Math.round(g.tagValues[index] ?? 0))
        })).filter(s => s.values.some(v => v > 0));

        const tagTotals = tagSeries.map(s => ({
            id: s.id, label: s.label, color: s.color,
            value: s.values.reduce((sum, v) => sum + v, 0)
        }));

        return {
            statusSeries,
            totalTrackedMinutes,
            timeLabels,
            timeTotals: roundedTimeTotals,
            contextSeries,
            contextTotals,
            tagSeries,
            tagTotals,
            contexts: contextsRaw,
            tags: tagsRaw
        };
    }, [isInitialized, selectedContextIds, selectedTagIds, goals, contextsRaw, tagsRaw, timeEntries, goalPeriods, dateLabels, contextColorMap, tagColorMap]);

    return {
        isInitialized,
        processed,
        contexts: contextsRaw,
        tags: tagsRaw
    };
}
