import { parseLocalDate } from "./date";

/**
 * SoundCloud's `/search/tracks` only understands coarse buckets for date and length
 * (the same ones its own search page offers). These helpers map our exact ranges
 * onto the tightest bucket that is still a *superset*, so the server pre-filters
 * and the client-side predicates do the exact refinement.
 */

export const SCCreatedAtBucket = {
  LastHour: "last_hour",
  LastDay: "last_day",
  LastWeek: "last_week",
  LastMonth: "last_month",
  LastYear: "last_year",
} as const;

export type SCCreatedAtBucket = (typeof SCCreatedAtBucket)[keyof typeof SCCreatedAtBucket];

export const SCDurationBucket = {
  Short: "short",
  Medium: "medium",
  Long: "long",
  Epic: "epic",
} as const;

export type SCDurationBucket = (typeof SCDurationBucket)[keyof typeof SCDurationBucket];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Conservative window lengths (a "month" is taken as 28 days) so the chosen
 * bucket always covers at least `from`.
 */
const CREATED_AT_WINDOWS: readonly [SCCreatedAtBucket, number][] = [
  [SCCreatedAtBucket.LastHour, HOUR_MS],
  [SCCreatedAtBucket.LastDay, DAY_MS],
  [SCCreatedAtBucket.LastWeek, 7 * DAY_MS],
  [SCCreatedAtBucket.LastMonth, 28 * DAY_MS],
  [SCCreatedAtBucket.LastYear, 365 * DAY_MS],
];

/**
 * Slack added to the range's age so that pages fetched a few minutes after the
 * first one still resolve to the same bucket (a bucket change mid-scroll would
 * shift the server-side result set under SC's offsets).
 */
const BUCKET_GRACE_MS = 15 * 60 * 1000;

/** Tightest `filter.created_at` bucket covering everything since `from`; null when unset or older than a year. */
export function createdAtBucketFor(
  from: string | null | undefined,
  now: number = Date.now(),
): SCCreatedAtBucket | null {
  const start = parseLocalDate(from);
  if (start == null) return null;

  const age = now - start + BUCKET_GRACE_MS;
  for (const [bucket, windowMs] of CREATED_AT_WINDOWS) {
    if (age <= windowMs) return bucket;
  }
  return null;
}

/** [lo, hi] in seconds, inclusive on our side. */
const DURATION_BANDS: readonly [SCDurationBucket, number, number][] = [
  [SCDurationBucket.Short, 0, 120],
  [SCDurationBucket.Medium, 120, 600],
  [SCDurationBucket.Long, 600, 1800],
  [SCDurationBucket.Epic, 1800, Infinity],
];

/**
 * `filter.duration` bucket whose band contains [minSec, maxSec]; null when the
 * range spans several bands or no bound is set. Bounds sitting exactly on a band
 * edge are accepted — SC's own edge handling is unknown, and only a track whose
 * length is that exact millisecond could be affected.
 */
export function durationBucketFor(
  minSec: number | null | undefined,
  maxSec: number | null | undefined,
): SCDurationBucket | null {
  if (minSec == null && maxSec == null) return null;
  const lo = minSec ?? 0;
  const hi = maxSec ?? Infinity;
  if (lo > hi) return null;

  for (const [bucket, bandLo, bandHi] of DURATION_BANDS) {
    if (lo >= bandLo && hi <= bandHi) return bucket;
  }
  return null;
}
