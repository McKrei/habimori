"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import CalendarDay from "@/src/components/calendar/CalendarDay";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const handlePointerStart = useCallback((clientX: number) => {
    swipeStartRef.current = clientX;
  }, []);

  const handlePointerEnd = useCallback(
    (clientX: number) => {
      if (swipeStartRef.current == null) return;
      const delta = clientX - swipeStartRef.current;
      swipeStartRef.current = null;
      if (Math.abs(delta) < 40) return;
      handleStep(delta < 0 ? 1 : -1);
    },
    [handleStep],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
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
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleStep]);

  return (
    <div
      ref={containerRef}
      className="select-none rounded-lg border border-slate-200 bg-white px-3 py-3 touch-pan-y"
      onPointerDown={(event) => {
        handlePointerStart(event.clientX);
      }}
      onPointerUp={(event) => {
        handlePointerEnd(event.clientX);
      }}
      onPointerCancel={() => {
        swipeStartRef.current = null;
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        handlePointerStart(touch.clientX);
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        handlePointerEnd(touch.clientX);
      }}
    >
      <div className="flex items-center justify-around">
        {days.map((day) => {
          const isToday = day.key === todayKey;
          const isSelected = day.key === selectedKey;
          const dayLabel = formatWeekday.format(day.date);
          return (
            <CalendarDay
              key={day.key}
              weekday={dayLabel}
              date={day.date.getDate()}
              counts={statusMap[day.key]}
              isToday={isToday}
              isSelected={isSelected}
              onClick={() => onChange(day.date)}
            />
          );
        })}
      </div>
    </div>
  );
}
