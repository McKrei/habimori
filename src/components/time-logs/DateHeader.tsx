"use client";

interface DateHeaderProps {
  date: Date;
  totalSeconds: number;
  formatSeconds: (seconds: number) => string;
}

const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export function DateHeader({ date, totalSeconds, formatSeconds }: DateHeaderProps) {
  const dayName = DAYS[date.getDay()];
  const dayNum = date.getDate();
  const monthName = MONTHS[date.getMonth()];

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
      <span className="text-sm font-medium text-slate-700">
        {dayName}, {dayNum} {monthName}
      </span>
      <span className="text-sm font-medium text-slate-600">
        {formatSeconds(totalSeconds)}
      </span>
    </div>
  );
}
