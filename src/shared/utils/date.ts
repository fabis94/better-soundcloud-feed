/**
 * Local-date helpers for the "YYYY-MM-DD" strings produced by `<input type="date">`.
 * `new Date("YYYY-MM-DD")` would parse as UTC midnight, so the parts are parsed by
 * hand and fed to the local-time constructor.
 */

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local midnight (ms since epoch) for a "YYYY-MM-DD" string, or null when malformed/invalid. */
export function parseLocalDate(ymd: string | null | undefined): number | null {
  if (!ymd) return null;
  const match = YMD_RE.exec(ymd);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // The constructor rolls invalid dates over (2026-02-30 → Mar 2); reject those.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date.getTime();
}

export interface LocalDateRange {
  /** Inclusive start (local midnight of `from`), or null when unset/invalid. */
  start: number | null;
  /** Exclusive end (local midnight of the day after `to`), or null when unset/invalid. */
  endExclusive: number | null;
}

/** Both bounds are inclusive calendar days; `to` therefore ends at the next local midnight. */
export function localDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
): LocalDateRange {
  const start = parseLocalDate(from);
  const toStart = parseLocalDate(to);
  let endExclusive: number | null = null;
  if (toStart != null) {
    const end = new Date(toStart);
    end.setDate(end.getDate() + 1); // DST/month-end safe
    endExclusive = end.getTime();
  }
  return { start, endExclusive };
}
