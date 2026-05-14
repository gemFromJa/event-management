// packages/client/__tests__/date.test.ts
import { describe, it, expect } from "vitest";
import {
  toLocalDate,
  formatDate,
  formatWeekday,
  formatTime,
} from "../src/lib/date";

// 2026-06-17 Wednesday 19:30 UTC
const TIMESTAMP = new Date("2026-06-17T19:30:00Z").getTime();

describe("toLocalDate", () => {
  it("returns date in YYYY-MM-DD format", () => {
    const result = toLocalDate(TIMESTAMP);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatDate", () => {
  it("returns month and day", () => {
    const result = formatDate(TIMESTAMP);
    expect(result).toMatch(/\w+ \d+/);
  });

  it("does not include year", () => {
    const result = formatDate(TIMESTAMP);
    expect(result).not.toContain("2026");
  });

  it("does not include weekday", () => {
    const result = formatDate(TIMESTAMP);
    const weekdays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    weekdays.forEach((day) => expect(result).not.toContain(day));
  });
});

describe("formatWeekday", () => {
  it("returns a weekday string", () => {
    const result = formatWeekday(TIMESTAMP);
    const weekdays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    expect(weekdays.some((d) => result.includes(d))).toBe(true);
  });

  it("does not include date numbers", () => {
    const result = formatWeekday(TIMESTAMP);
    expect(result).not.toMatch(/\d/);
  });
});

describe("formatTime", () => {
  it("returns time with AM or PM", () => {
    const result = formatTime(TIMESTAMP);
    expect(result).toMatch(/AM|PM/i);
  });

  it("includes minutes with two digits", () => {
    const result = formatTime(TIMESTAMP);
    expect(result).toMatch(/:\d{2}/);
  });

  it("does not include seconds", () => {
    const result = formatTime(TIMESTAMP);
    // time should only have one colon for HH:MM
    const colonCount = (result.match(/:/g) || []).length;
    expect(colonCount).toBe(1);
  });
});
