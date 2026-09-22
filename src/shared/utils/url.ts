import type { SCActivityType } from "../types";

const API_HOST = "api-v2.soundcloud.com";
const STREAM_RE = /api-v2\.soundcloud\.com\/(stream|feed)/;
const RECENT_TRACKS_RE = /api-v2\.soundcloud\.com\/recent-tracks\//;

/** Check if a URL is a SoundCloud stream/feed API call. */
export function isStreamUrl(url: string): boolean {
  return STREAM_RE.test(url);
}

/** `/recent-tracks/<tag>` — the tag page's "Recent Tracks" list. */
export function isRecentTracksUrl(url: string): boolean {
  return RECENT_TRACKS_RE.test(url);
}

/**
 * `/search/tracks?…&filter.genre_or_tag=<tag>` — the tag page's "Popular Tracks"
 * list. The global search page hits the same path but uses `filter.genre`, so the
 * tag param is what identifies this request.
 */
export function isTagSearchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === API_HOST &&
      parsed.pathname === "/search/tracks" &&
      parsed.searchParams.has("filter.genre_or_tag")
    );
  } catch {
    return false;
  }
}

/** Extract the URL string from a fetch input. */
export function extractUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url;
  return String(input);
}

/**
 * Set (string) or delete (null) query params. Deleting matters: SC echoes our
 * params back in `next_href`, so a cleared filter must also strip the stale value.
 */
export function withQueryParams(url: string, params: Record<string, string | null>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value === null) parsed.searchParams.delete(key);
    else parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

/** Set activityTypes query param on a URL (comma-separated, matching SC's format). */
export function withActivityTypes(url: string, activityTypes: SCActivityType[]): string {
  return withQueryParams(url, { activityTypes: activityTypes.join(",") });
}

/** How much larger than SC's own page size we request when client-side filters would thin a page out. */
export const PAGE_LIMIT_BOOST_RATIO = 2;

/**
 * Multiply `limit` on a first-page request (`offset` absent or `0`) and cap it.
 * Later pages come from `next_href`, which already echoes the boosted value, so
 * they are returned untouched — otherwise the limit would compound page after
 * page. A missing or non-numeric `limit` is never invented.
 */
export function withBoostedLimit(url: string, ratio: number, cap: number): string {
  const parsed = new URL(url);
  const offset = parsed.searchParams.get("offset");
  if (offset !== null && offset !== "0") return url;

  const limit = Number(parsed.searchParams.get("limit"));
  if (!Number.isInteger(limit) || limit <= 0) return url;

  parsed.searchParams.set("limit", String(Math.min(cap, limit * ratio)));
  return parsed.toString();
}
