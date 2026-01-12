"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CalendarDay from "@/src/components/calendar/CalendarDay";
import { useDayStatusMap } from "@/src/components/calendar/useDayStatusMap";
import { addDays, getDateString, getTodayDateString } from "./utils";
import { useTranslation } from "@/src/i18n/TranslationContext";

type HomeWeekCalendarProps = {
  selectedDate: Date;
  onChange: (nextDate: Date) => void;
};

// Breakpoints for responsive day count
const BREAKPOINTS = {
  mobile: 640,  // sm breakpoint
  tablet: 768,  // md breakpoint
  desktop: 1024, // lg breakpoint
};

// Day counts per screen size
const DAY_COUNTS = {
  mobile: 5,    // minimum on small screens
  tablet: 7,    // medium screens
  desktop: 9,   // large screens
  wide: 11,     // extra wide screens
};

function getDayCountForWidth(width: number): number {
  if (width >= 1280) return DAY_COUNTS.wide;
  if (width >= BREAKPOINTS.desktop) return DAY_COUNTS.desktop;
  if (width >= BREAKPOINTS.tablet) return DAY_COUNTS.tablet;
  if (width >= BREAKPOINTS.mobile) return DAY_COUNTS.tablet;
  return DAY_COUNTS.mobile;
}

function useResponsiveDayCount(): number {
  const [dayCount, setDayCount] = useState(() => {
    // Initialize with correct value on client side
    if (typeof window !== "undefined") {
      return getDayCountForWidth(window.innerWidth);
    }
    return DAY_COUNTS.desktop; // SSR fallback - use larger value
  });

  useEffect(() => {
    const updateDayCount = () => {
      setDayCount(getDayCountForWidth(window.innerWidth));
    };

    // Update on mount to ensure correct value after hydration
    updateDayCount();
    window.addEventListener("resize", updateDayCount);
    return () => window.removeEventListener("resize", updateDayCount);
  }, []);

  return dayCount;
}

function generateDayOffsets(count: number): number[] {
  const half = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) => i - half);
}

export default function HomeWeekCalendar({
  selectedDate,
  onChange,
}: HomeWeekCalendarProps) {
  const { language } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(0);
  const swipeStartRef = useRef<number | null>(null);
  const todayKey = useMemo(() => getTodayDateString(), []);
  const selectedKey = useMemo(
    () => getDateString(selectedDate),
    [selectedDate],
  );

  const dayCount = useResponsiveDayCount();
  const dayOffsets = useMemo(() => generateDayOffsets(dayCount), [dayCount]);

  const days = useMemo(
    () =>
      dayOffsets.map((offset) => {
        const date = addDays(selectedDate, offset);
        return {
          date,
          key: getDateString(date),
        };
      }),
    [selectedDate, dayOffsets],
  );
  const dayDates = useMemo(() => days.map((day) => day.date), [days]);
  const { statusMap } = useDayStatusMap(dayDates);

  const locale = language === "ru" ? "ru-RU" : "en-US";
  const formatWeekday = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
      }),
    [locale],
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
