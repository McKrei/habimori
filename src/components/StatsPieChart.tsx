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
};

function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const startRad = ((start - 90) * Math.PI) / 180;
  const endRad = ((end - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArcFlag = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

export default function StatsPieChart({ slices, size = 220 }: StatsPieChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let angle = 0;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Pie chart"
      >
        {slices.map((slice) => {
          const sliceAngle = (slice.value / total) * 360;
          const path = describeArc(
            size / 2,
            size / 2,
            size / 2,
            angle,
            angle + sliceAngle,
          );
          const currentAngle = angle;
          angle += sliceAngle;
          return (
            <path key={slice.id} d={path} fill={slice.color} data-angle={currentAngle} />
          );
        })}
      </svg>
      <div className="flex flex-col gap-2 text-xs text-slate-600">
        {slices.map((slice) => (
          <div key={slice.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="font-medium text-slate-700">{slice.label}</span>
            <span>{slice.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
