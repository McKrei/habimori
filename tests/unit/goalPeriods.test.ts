import { describe, expect, it } from "vitest";
import { getPeriodRangeForDate } from "../../src/components/goalPeriods";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("getPeriodRangeForDate", () => {
  it("builds day range", () => {
    const date = new Date(2024, 0, 15, 12, 0, 0);
    const range = getPeriodRangeForDate("day", date);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const expected = formatLocalDate(dayStart);
    expect(range.period_start).toBe(expected);
    expect(range.period_end).toBe(expected);
    expect(range.end.getTime() - range.start.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("builds week range", () => {
    const date = new Date(2024, 0, 3, 12, 0, 0);
    const range = getPeriodRangeForDate("week", date);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const day = dayStart.getDay();
    const diff = (day + 6) % 7;
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - diff);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    expect(range.period_start).toBe(formatLocalDate(weekStart));
    expect(range.period_end).toBe(formatLocalDate(weekEnd));
    expect(range.end.getTime() - range.start.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it("builds month range", () => {
    const date = new Date(2024, 1, 10, 12, 0, 0);
    const range = getPeriodRangeForDate("month", date);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    expect(range.period_start).toBe(formatLocalDate(monthStart));
    expect(range.period_end).toBe(formatLocalDate(monthEnd));
    const days =
      (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(29);
  });
});
