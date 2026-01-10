import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDurationMinutes,
  formatMinutesAsHHMM,
  formatSecondsAsHHMMSS,
} from "../../src/components/formatters";

describe("formatters", () => {
  it("formats dates safely", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("2024-01-02")).toContain("2024");
  });

  it("formats date-time safely", () => {
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("2024-01-02T03:04:05.000Z")).toContain("2024");
  });

  it("formats duration minutes", () => {
    expect(formatDurationMinutes(Number.NaN)).toBe("—");
    expect(formatDurationMinutes(12)).toBe("12 min");
    expect(formatDurationMinutes(75)).toBe("1.3 h");
  });

  it("formats minutes and seconds into fixed width strings", () => {
    expect(formatMinutesAsHHMM(0)).toBe("00:00");
    expect(formatMinutesAsHHMM(65)).toBe("01:05");
    expect(formatSecondsAsHHMMSS(0)).toBe("00:00:00");
    expect(formatSecondsAsHHMMSS(3661)).toBe("01:01:01");
  });
});
