"use client";

import type { DayStatusCounts } from "./useDayStatusMap";
import {
  getRingThickness,
  MIN_SEGMENT_DEGREES,
  SEGMENT_GAP_DEGREES,
  SEGMENT_ORDER,
  STATUS_COLORS,
} from "./donutConfig";

type DonutRingProps = {
  counts?: DayStatusCounts;
  size: number;
  disabled?: boolean;
};

type Segment = {
  status: (typeof SEGMENT_ORDER)[number];
  count: number;
  color: string;
};

export default function DonutRing({ counts, size, disabled }: DonutRingProps) {
  if (!counts) return null;

  const total = counts.success + counts.in_progress + counts.fail;
  if (total === 0) return null;

  const thickness = getRingThickness(total);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Собираем сегменты с ненулевым количеством
  const segments: Segment[] = SEGMENT_ORDER.filter(
    (status) => counts[status] > 0,
  ).map((status) => ({
    status,
    count: counts[status],
    color: STATUS_COLORS[status],
  }));

  // Один сегмент — полный круг
  if (segments.length === 1) {
    return (
      <svg
        width={size}
        height={size}
        className={disabled ? "opacity-40" : undefined}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={segments[0].color}
          strokeWidth={thickness}
        />
      </svg>
    );
  }

  // Несколько сегментов — вычисляем углы с учётом зазоров и минимума
  const totalGapDegrees = SEGMENT_GAP_DEGREES * segments.length;
  const availableDegrees = 360 - totalGapDegrees;

  // Вычисляем "сырые" углы пропорционально долям
  const rawAngles = segments.map((seg) => (seg.count / total) * availableDegrees);

  // Применяем минимальный угол
  const adjustedAnglesRaw = rawAngles.map((angle) =>
    Math.max(angle, MIN_SEGMENT_DEGREES),
  );

  // Нормализуем, чтобы сумма была availableDegrees
  const sumAdjusted = adjustedAnglesRaw.reduce((a, b) => a + b, 0);
  const adjustedAngles =
    sumAdjusted > availableDegrees
      ? adjustedAnglesRaw.map((angle) => angle * (availableDegrees / sumAdjusted))
      : adjustedAnglesRaw;

  // Вычисляем начальные углы для каждого сегмента
  const startAngles = adjustedAngles.reduce<number[]>((acc, angle, index) => {
    if (index === 0) {
      acc.push(-90); // Начинаем сверху (12 часов)
    } else {
      const prevStart = acc[index - 1];
      const prevAngle = adjustedAngles[index - 1];
      acc.push(prevStart + prevAngle + SEGMENT_GAP_DEGREES);
    }
    return acc;
  }, []);

  // Рендерим дуги
  const arcs = segments.map((segment, index) => {
    const angleDegrees = adjustedAngles[index];
    const startAngle = startAngles[index];
    const dashLength = (angleDegrees / 360) * circumference;
    const dashArray = `${dashLength} ${circumference - dashLength}`;
    const dashOffset = -(startAngle + 90) * (circumference / 360);

    return (
      <circle
        key={segment.status}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={segment.color}
        strokeWidth={thickness}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      width={size}
      height={size}
      className={disabled ? "opacity-40" : undefined}
    >
      {arcs}
    </svg>
  );
}
