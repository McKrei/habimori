"use client";

import { useMemo } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";

interface DateHeaderProps {
  date: Date;
  totalSeconds: number;
  formatSeconds: (seconds: number) => string;
}

export function DateHeader({ date, totalSeconds, formatSeconds }: DateHeaderProps) {
  const { language } = useTranslation();

  const locale = language === "ru" ? "ru-RU" : "en-US";

  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);
  }, [date, locale]);

  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
      <span className="text-sm font-medium text-text-secondary">
        {dateLabel}
      </span>
      <span className="text-sm font-medium text-text-secondary">
        {formatSeconds(totalSeconds)}
      </span>
    </div>
  );
}
