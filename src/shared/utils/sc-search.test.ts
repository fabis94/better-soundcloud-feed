import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import {
  SCCreatedAtBucket,
  SCDurationBucket,
  createdAtBucketFor,
  durationBucketFor,
} from "./sc-search";
import { parseLocalDate } from "./date";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const day = (ymd: string): number => parseLocalDate(ymd)!;

describe("createdAtBucketFor", () => {
  it("returns null when `from` is unset or invalid", () => {
    expect(createdAtBucketFor(null)).toBeNull();
    expect(createdAtBucketFor("")).toBeNull();
    expect(createdAtBucketFor("2026-02-30")).toBeNull();
  });

  it("picks last_hour just after midnight of `from`", () => {
    expect(createdAtBucketFor("2026-09-22", day("2026-09-22") + 30 * MINUTE)).toBe(
      SCCreatedAtBucket.LastHour,
    );
  });

  it("applies a grace margin so a slightly later page keeps a superset bucket", () => {
    // 50 min + 15 min grace > 1 h → last_day, not last_hour
    expect(createdAtBucketFor("2026-09-22", day("2026-09-22") + 50 * MINUTE)).toBe(
      SCCreatedAtBucket.LastDay,
    );
  });

  it("walks up the buckets as `from` gets older", () => {
    const now = day("2026-09-22") + 2 * HOUR;
    expect(createdAtBucketFor("2026-09-22", now)).toBe(SCCreatedAtBucket.LastDay);
    expect(createdAtBucketFor("2026-09-21", now)).toBe(SCCreatedAtBucket.LastWeek);
    expect(createdAtBucketFor("2026-09-16", now)).toBe(SCCreatedAtBucket.LastWeek);
    expect(createdAtBucketFor("2026-09-15", now)).toBe(SCCreatedAtBucket.LastMonth);
    expect(createdAtBucketFor("2026-08-26", now)).toBe(SCCreatedAtBucket.LastMonth);
    expect(createdAtBucketFor("2026-08-24", now)).toBe(SCCreatedAtBucket.LastYear);
    expect(createdAtBucketFor("2025-09-25", now)).toBe(SCCreatedAtBucket.LastYear);
  });

  it("returns null when `from` is older than a year (no bucket is a superset)", () => {
    expect(createdAtBucketFor("2025-09-01", day("2026-09-22"))).toBeNull();
  });

  it("maps a future `from` to the tightest bucket", () => {
    expect(createdAtBucketFor("2026-09-23", day("2026-09-22"))).toBe(SCCreatedAtBucket.LastHour);
  });
});

describe("durationBucketFor", () => {
  it("returns null when neither bound is set", () => {
    expect(durationBucketFor(null, null)).toBeNull();
    expect(durationBucketFor(undefined, undefined)).toBeNull();
  });

  it("maps ranges that fit inside one SC band", () => {
    expect(durationBucketFor(null, 120)).toBe(SCDurationBucket.Short);
    expect(durationBucketFor(0, 90)).toBe(SCDurationBucket.Short);
    expect(durationBucketFor(120, 600)).toBe(SCDurationBucket.Medium);
    expect(durationBucketFor(300, 400)).toBe(SCDurationBucket.Medium);
    expect(durationBucketFor(600, 1800)).toBe(SCDurationBucket.Long);
    expect(durationBucketFor(900, null)).toBeNull(); // 15 min → open-ended spans long + epic
    expect(durationBucketFor(1800, null)).toBe(SCDurationBucket.Epic);
    expect(durationBucketFor(3600, 7200)).toBe(SCDurationBucket.Epic);
  });

  it("returns null when the range spans several bands", () => {
    expect(durationBucketFor(100, 200)).toBeNull();
    expect(durationBucketFor(null, 900)).toBeNull();
    expect(durationBucketFor(60, null)).toBeNull();
    expect(durationBucketFor(0, null)).toBeNull();
    expect(durationBucketFor(500, 2000)).toBeNull();
  });

  it("returns null for an inverted range", () => {
    expect(durationBucketFor(700, 600)).toBeNull();
  });
});
