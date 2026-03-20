import type { SCActivityType } from "./types";

const STREAM_RE = /api-v2\.soundcloud\.com\/(stream|feed)/;

/** Check if a URL is a SoundCloud stream/feed API call. */
export function isStreamUrl(url: string): boolean {
  return STREAM_RE.test(url);
}

/** Extract the URL string from a fetch input. */
export function extractUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url;
  return String(input);
}

/** Override the `limit` query param on a URL. */
export function withLimit(url: string, limit: number): string {
  const parsed = new URL(url);
  parsed.searchParams.set("limit", String(limit));
  return parsed.toString();
}

/** Set activityTypes query param on a URL (comma-separated, matching SC's format). */
export function withActivityTypes(url: string, activityTypes: SCActivityType[]): string {
  const parsed = new URL(url);
  parsed.searchParams.set("activityTypes", activityTypes.join(","));
  return parsed.toString();
}
