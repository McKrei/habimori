type Slice = {
  id: string;
  label: string;
  value: number;
  color: string;
  meta?: string;
};

type StatsPieChartProps = {
  slices: Slice[];
  size?: number;
  onSliceClick?: (sliceId: string, value: number) => void;
};

function describeArc(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
) {
  const startRad = ((start - 90) * Math.PI) / 180;
  const endRad = ((end - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArcFlag = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

export default function StatsPieChart({
  slices,
  size = 220,
  onSliceClick,
}: StatsPieChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const arcs = slices.reduce(
    (acc, slice) => {
      const sliceAngle = (slice.value / total) * 360;
      const startAngle = acc.angle;
      const endAngle = startAngle + sliceAngle;
      const path = describeArc(
        size / 2,
        size / 2,
        size / 2,
        startAngle,
        endAngle,
      );
      acc.items.push({
        id: slice.id,
        color: slice.color,
        path,
        startAngle,
        value: slice.value,
      });
      acc.angle = endAngle;
      return acc;
    },
    {
      angle: 0,
      items: [] as {
        id: string;
        color: string;
        path: string;
        startAngle: number;
        value: number;
      }[],
    },
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Pie chart"
      >
        {arcs.items.map((arc) => (
          <path
            key={arc.id}
            d={arc.path}
            fill={arc.color}
            stroke="#1f2937"
            strokeWidth={0.75}
            strokeLinejoin="round"
            data-angle={arc.startAngle}
            className={onSliceClick ? "cursor-pointer" : undefined}
            onClick={() => onSliceClick?.(arc.id, arc.value)}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-2 text-xs text-text-secondary">
        {slices.map((slice) => (
          <div key={slice.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="font-medium text-text-secondary">{slice.label}</span>
            <span>{slice.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
