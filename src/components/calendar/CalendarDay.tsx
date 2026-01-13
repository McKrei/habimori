"use client";

import DonutRing from "./DonutRing";
import type { DayStatusCounts } from "./useDayStatusMap";

type CalendarDayProps = {
  weekday: string;
  date: number;
  counts?: DayStatusCounts;
  isSelected?: boolean;
  isToday?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

const RING_SIZE = 52;
const INNER_SIZE = 44;

export default function CalendarDay({
  weekday,
  date,
  counts,
  isSelected,
  isToday,
  disabled,
  onClick,
}: CalendarDayProps) {
  // Стили внутреннего круга
  let innerStyles =
    "absolute inset-0 m-auto flex flex-col items-center justify-center rounded-full transition-colors";

  if (isSelected) {
    innerStyles += " bg-accent text-surface";
  } else if (isToday) {
    innerStyles += " bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/30";
  } else {
    innerStyles += " text-text-secondary hover:bg-surface-elevated";
  }

  if (disabled) {
    innerStyles += " opacity-50";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      {/* Кольцо статусов */}
      <div className="absolute inset-0">
        <DonutRing counts={counts} size={RING_SIZE} disabled={disabled} />
      </div>

      {/* Внутренний круг с контентом */}
      <div
        className={innerStyles}
        style={{ width: INNER_SIZE, height: INNER_SIZE }}
      >
        <span className="text-[10px] uppercase leading-tight tracking-wide">
          {weekday}
        </span>
        <span className="text-base font-semibold leading-tight">{date}</span>
      </div>
    </button>
  );
}
