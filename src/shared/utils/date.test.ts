import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { parseLocalDate, localDateRange } from "./date";

describe("parseLocalDate", () => {
  it("parses to local midnight", () => {
    expect(parseLocalDate("2026-03-15")).toBe(new Date(2026, 2, 15).getTime());
  });

  it("returns null for empty input", () => {
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
  });

  it.each(["2026-3-5", "15/03/2026", "2026-03-15T00:00", "2026-03-15Z", "abc", "20260315"])(
    "returns null for malformed %s",
    (input) => {
      expect(parseLocalDate(input)).toBeNull();
    },
  );

  it("rejects dates the constructor would roll over", () => {
    expect(parseLocalDate("2026-02-30")).toBeNull();
    expect(parseLocalDate("2026-13-01")).toBeNull();
    expect(parseLocalDate("2026-04-31")).toBeNull();
  });

  it("accepts leap days only in leap years", () => {
    expect(parseLocalDate("2024-02-29")).toBe(new Date(2024, 1, 29).getTime());
    expect(parseLocalDate("2026-02-29")).toBeNull();
  });
});

describe("localDateRange", () => {
  it("start is local midnight of `from`", () => {
    expect(localDateRange("2026-09-21", null).start).toBe(new Date(2026, 8, 21).getTime());
  });

  it("end is the local midnight after `to` (inclusive day)", () => {
    expect(localDateRange(null, "2026-09-21").endExclusive).toBe(new Date(2026, 8, 22).getTime());
  });

  it("rolls the end over month and year boundaries", () => {
    expect(localDateRange(null, "2026-09-30").endExclusive).toBe(new Date(2026, 9, 1).getTime());
    expect(localDateRange(null, "2026-12-31").endExclusive).toBe(new Date(2027, 0, 1).getTime());
  });

  it("stays on calendar days across a DST change", () => {
    // Whatever the zone, the day after 2026-03-29 must be exactly 2026-03-30 00:00 local.
    expect(localDateRange(null, "2026-03-29").endExclusive).toBe(new Date(2026, 2, 30).getTime());
  });

  it("returns nulls when unset or invalid", () => {
    expect(localDateRange(null, null)).toEqual({ start: null, endExclusive: null });
    expect(localDateRange("", "")).toEqual({ start: null, endExclusive: null });
    expect(localDateRange("nope", "2026-02-30")).toEqual({ start: null, endExclusive: null });
  });
});
