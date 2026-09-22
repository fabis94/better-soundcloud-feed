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
 * Page-size control for an intercepted list request:
 * - a first-page request (`offset` absent, empty or `0`) gets `limit × ratio`;
 * - every request is clamped to `cap`, because SC's lazy list grows its own page
 *   size when pages come back short (10 → 20 → 40 → 80 was observed once our
 *   filtering thinned them) and `/recent-tracks` rejects anything above 50.
 * Later pages are otherwise left alone: `next_href` already echoes the boosted
 * value, so multiplying again would compound. A missing or non-numeric `limit`
 * is never invented.
 */
export function withPageLimit(url: string, ratio: number, cap: number): string {
  const parsed = new URL(url);
  const limit = Number(parsed.searchParams.get("limit"));
  if (!Number.isInteger(limit) || limit <= 0) return url;

  const offset = parsed.searchParams.get("offset");
  const isFirstPage = offset === null || offset === "" || offset === "0";
  const wanted = Math.min(cap, isFirstPage ? limit * ratio : limit);
  if (wanted === limit) return url;

  parsed.searchParams.set("limit", String(wanted));
  return parsed.toString();
}
