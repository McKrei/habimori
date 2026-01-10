"use client";

import { useCallback, useMemo, useRef } from "react";
import DayStatusDots from "@/src/components/calendar/DayStatusDots";
import { useDayStatusMap } from "@/src/components/calendar/useDayStatusMap";
import { addDays, getDateString, getTodayDateString } from "./utils";

type HomeWeekCalendarProps = {
  selectedDate: Date;
  onChange: (nextDate: Date) => void;
};

const DAY_OFFSETS = [-2, -1, 0, 1, 2];

export default function HomeWeekCalendar({
  selectedDate,
  onChange,
}: HomeWeekCalendarProps) {
  const wheelLockRef = useRef(0);
  const swipeStartRef = useRef<number | null>(null);
  const todayKey = useMemo(() => getTodayDateString(), []);
  const selectedKey = useMemo(
    () => getDateString(selectedDate),
    [selectedDate],
  );

  const days = useMemo(
    () =>
      DAY_OFFSETS.map((offset) => {
        const date = addDays(selectedDate, offset);
        return {
          date,
          key: getDateString(date),
        };
      }),
    [selectedDate],
  );
  const dayDates = useMemo(() => days.map((day) => day.date), [days]);
  const { statusMap } = useDayStatusMap(dayDates);

  const formatWeekday = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
      }),
    [],
  );

  const handleStep = useCallback(
    (delta: number) => {
      if (delta === 0) return;
      const next = addDays(selectedDate, delta > 0 ? 1 : -1);
      onChange(next);
    },
    [onChange, selectedDate],
  );

  return (
    <div
      className="select-none rounded-lg border border-slate-200 bg-white px-3 py-2"
      onWheel={(event) => {
        const now = Date.now();
        if (now - wheelLockRef.current < 120) return;
        const delta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;
        if (Math.abs(delta) < 8) return;
        event.preventDefault();
        wheelLockRef.current = now;
        handleStep(delta);
      }}
      onPointerDown={(event) => {
        swipeStartRef.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (swipeStartRef.current == null) return;
        const delta = event.clientX - swipeStartRef.current;
        swipeStartRef.current = null;
        if (Math.abs(delta) < 40) return;
        handleStep(delta < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        swipeStartRef.current = null;
      }}
    >
      <div className="flex items-center justify-between gap-2">
        {days.map((day) => {
          const isToday = day.key === todayKey;
          const isSelected = day.key === selectedKey;
          const baseStyles =
            "flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition";
          const highlightStyles = isToday
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : isSelected
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100";
          const dayLabel = formatWeekday.format(day.date);
          return (
            <button
              key={day.key}
              className={`${baseStyles} ${highlightStyles}`}
              type="button"
              onClick={() => onChange(day.date)}
            >
              <span className="text-[11px] uppercase tracking-wide">
                {dayLabel}
              </span>
              <span className="text-lg font-semibold">
                {day.date.getDate()}
              </span>
              {isToday ? (
                <span className="text-[10px] font-semibold">Сегодня</span>
              ) : (
                <span className="text-[10px] text-transparent">.</span>
              )}
              <DayStatusDots statuses={statusMap[day.key]} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
