import { getPeriodRangeForDate } from "../src/components/goalPeriods";

describe("getPeriodRangeForDate", () => {
  it("returns day boundaries", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    const range = getPeriodRangeForDate("day", date);
    expect(range.period_start).toBe("2024-01-15");
    expect(range.period_end).toBe("2024-01-15");
  });

  it("returns week boundaries", () => {
    const date = new Date("2024-01-17T12:00:00Z");
    const range = getPeriodRangeForDate("week", date);
    expect(range.period_start).toBe("2024-01-15");
    expect(range.period_end).toBe("2024-01-21");
  });

  it("returns month boundaries", () => {
    const date = new Date("2024-02-10T12:00:00Z");
    const range = getPeriodRangeForDate("month", date);
    expect(range.period_start).toBe("2024-02-01");
    expect(range.period_end).toBe("2024-02-29");
  });
});
