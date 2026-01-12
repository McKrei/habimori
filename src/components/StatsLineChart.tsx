import type { ReactNode } from "react";

export type LineSeries = {
  id: string;
  label: string;
  color: string;
  values: number[];
  meta?: ReactNode;
};

type StatsLineChartProps = {
  labels: string[];
  series: LineSeries[];
  height?: number;
};

export default function StatsLineChart({
  labels,
  series,
  height = 200,
}: StatsLineChartProps) {
  const maxValue = Math.max(1, ...series.flatMap((line) => line.values));
  const width = 720;
  const chartHeight = 160;
  const padding = { top: 16, right: 16, bottom: 24, left: 16 };
  const chartWidth = width - padding.left - padding.right;
  const baseline = padding.top + chartHeight;

  const toPoint = (index: number, value: number) => {
    const x =
      padding.left +
      (labels.length > 1 ? (index / (labels.length - 1)) * chartWidth : 0);
    const y = baseline - (value / maxValue) * chartHeight;
    return `${x},${y}`;
  };

  const tickIndexes =
    labels.length <= 4
      ? labels.map((_, index) => index)
      : [0, Math.floor(labels.length / 2), labels.length - 1];

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Line chart"
      >
        <line
          x1={padding.left}
          y1={baseline}
          x2={width - padding.right}
          y2={baseline}
          stroke="#e2e8f0"
          strokeWidth="2"
        />
        {series.map((line) => (
          <polyline
            key={line.id}
            fill="none"
            stroke={line.color}
            strokeWidth="3"
            points={line.values
              .map((value, index) => toPoint(index, value))
              .join(" ")}
          />
        ))}
        {tickIndexes.map((index) => {
          const x =
            padding.left +
            (labels.length > 1
              ? (index / (labels.length - 1)) * chartWidth
              : 0);
          const label = labels[index] ?? "";
          return (
            <text
              key={`${label}-${index}`}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fontSize="11"
              fill="#94a3b8"
            >
              {label}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        {series.map((line) => (
          <div key={line.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="font-medium text-text-secondary">{line.label}</span>
            {line.meta}
          </div>
        ))}
      </div>
    </div>
  );
}
