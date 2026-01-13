export type BarSeries = {
  id: string;
  label: string;
  color: string;
  values: number[];
};

type StatsStackedBarChartProps = {
  labels: string[];
  series: BarSeries[];
  totals: number[];
  formatTotal: (value: number) => string;
  onSegmentClick?: (seriesId: string, value: number) => void;
};

export default function StatsStackedBarChart({
  labels,
  series,
  totals,
  formatTotal,
  onSegmentClick,
}: StatsStackedBarChartProps) {
  const maxTotal = Math.max(1, ...totals);
  const barHeight = 160;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        {labels.map((label, index) => {
          const total = totals[index] ?? 0;
          const height = maxTotal ? (total / maxTotal) * barHeight : 0;
          const visibleSeries = series.filter(
            (item) => (item.values[index] ?? 0) > 0,
          );

          return (
            <div
              key={`${label}-${index}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="text-[10px] font-semibold text-text-muted">
                {formatTotal(total)}
              </div>
              <div
                className="flex w-full items-end"
                style={{ height: barHeight }}
              >
                <div
                  className="flex w-full flex-col-reverse overflow-hidden rounded-md border border-border"
                  style={{ height }}
                >
                  {visibleSeries.length === 0 ? (
                    <div className="h-full w-full bg-surface-elevated" />
                  ) : (
                    visibleSeries.map((item) => {
                      const value = item.values[index] ?? 0;
                      const segmentHeight = total ? (value / total) * 100 : 0;
                      return (
                        <button
                          key={`${item.id}-${label}`}
                          type="button"
                          className="w-full"
                          style={{
                            height: `${segmentHeight}%`,
                            backgroundColor: item.color,
                          }}
                          onClick={() => onSegmentClick?.(item.id, value)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
              <div className="text-[10px] text-text-muted">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
