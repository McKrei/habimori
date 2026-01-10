import { describe, expect, it } from "vitest";
import { getPeriodRangeForDate } from "../../src/components/goalPeriods";

describe("getPeriodRangeForDate", () => {
  it("builds day range", () => {
    const date = new Date(2024, 0, 15, 12, 0, 0);
    const range = getPeriodRangeForDate("day", date);
    expect(range.period_start).toBe("2024-01-15");
    expect(range.period_end).toBe("2024-01-15");
    expect(range.end.getTime() - range.start.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("builds week range", () => {
    const date = new Date(2024, 0, 3, 12, 0, 0);
    const range = getPeriodRangeForDate("week", date);
    expect(range.period_start).toBe("2024-01-01");
    expect(range.period_end).toBe("2024-01-07");
    expect(range.end.getTime() - range.start.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it("builds month range", () => {
    const date = new Date(2024, 1, 10, 12, 0, 0);
    const range = getPeriodRangeForDate("month", date);
    expect(range.period_start).toBe("2024-02-01");
    expect(range.period_end).toBe("2024-02-29");
    const days =
      (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(29);
  });
});
