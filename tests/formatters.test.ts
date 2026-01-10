import {
  formatDurationMinutes,
  formatGoalTarget,
  formatMinutesAsHHMM,
  formatSecondsAsHHMMSS,
} from "../src/components/formatters";

describe("formatters", () => {
  it("formats minutes into HH:MM", () => {
    expect(formatMinutesAsHHMM(0)).toBe("00:00");
    expect(formatMinutesAsHHMM(75)).toBe("01:15");
    expect(formatMinutesAsHHMM(-5)).toBe("00:00");
  });

  it("formats seconds into HH:MM:SS", () => {
    expect(formatSecondsAsHHMMSS(0)).toBe("00:00:00");
    expect(formatSecondsAsHHMMSS(3661)).toBe("01:01:01");
  });

  it("formats durations for UI", () => {
    expect(formatDurationMinutes(45)).toBe("45 min");
    expect(formatDurationMinutes(90)).toBe("1.5 h");
  });

  it("formats goal targets", () => {
    expect(
      formatGoalTarget({ goal_type: "time", target_value: 120, target_op: "gte" }),
    ).toBe("≥ 120 min");
    expect(
      formatGoalTarget({ goal_type: "counter", target_value: 3, target_op: "lte" }),
    ).toBe("≤ 3");
  });
});
