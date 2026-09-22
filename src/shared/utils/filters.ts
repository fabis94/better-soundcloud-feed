import type {
  SCStreamItem,
  SCStreamResponse,
  SCTrack,
  SCPlaylist,
  SCTrackCollectionResponse,
  FilterState,
} from "../types";
import {
  parseSearchString,
  matchesSearch,
  getSearchableText,
  getTitleText,
  getDescriptionText,
  getGenreText,
  getArtistText,
  getLabelText,
} from "./search";
import { localDateRange } from "./date";

/** Whether any search input is in effect (mode-aware). Shared by the predicate and the page-size boost. */
function isSearchActive(filters: FilterState): boolean {
  if (filters.searchMode === "simple") {
    // No ticked search areas = search inactive, mirroring extended mode with all inputs empty.
    return Boolean(filters.searchString) && filters.searchFields.length > 0;
  }
  return [
    filters.searchTitle,
    filters.searchDescription,
    filters.searchGenre,
    filters.searchArtist,
    filters.searchLabel,
  ].some((raw) => raw.length > 0);
}

/** Check search filters against a single stream item. */
function matchesSearchFilters(item: SCStreamItem, filters: FilterState): boolean {
  if (!isSearchActive(filters)) return true;

  if (filters.searchMode === "simple") {
    const parsed = parseSearchString(filters.searchString);
    const text = getSearchableText(item, filters.searchFields);
    return matchesSearch(text, parsed, filters.searchOperator);
  }

  const fieldChecks: [string, string][] = [
    [filters.searchTitle, getTitleText(item)],
    [filters.searchDescription, getDescriptionText(item)],
    [filters.searchGenre, getGenreText(item)],
    [filters.searchArtist, getArtistText(item)],
    [filters.searchLabel, getLabelText(item)],
  ];

  const results = fieldChecks
    .filter(([raw]) => raw.length > 0)
    .map(([raw, text]) => matchesSearch(text, parseSearchString(raw), filters.searchOperator));

  return filters.searchOperator === "and" ? results.every(Boolean) : results.some(Boolean);
}

function isRangeActive(min: number | null, max: number | null): boolean {
  return min != null || max != null;
}

/** Inclusive numeric range check; a missing value never rejects (SC data is best-effort). */
function inRange(
  value: number | null | undefined,
  min: number | null,
  max: number | null,
): boolean {
  if (value == null) return true;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/**
 * "Any source" rule for values an item offers more than once (like the Artist
 * search area, which matches any of the names on the item): passes when at least
 * one present candidate is inside the range; candidates SC omitted are skipped,
 * and an item with no candidate at all passes.
 */
function anyInRange(
  candidates: readonly (number | null | undefined)[],
  min: number | null,
  max: number | null,
): boolean {
  const present = candidates.filter((value): value is number => value != null);
  if (present.length === 0) return true;
  return present.some((value) => inRange(value, min, max));
}

/** Check duration filter against a track's duration (ms). */
function matchesDuration(durationMs: number | null | undefined, filters: FilterState): boolean {
  return inRange(
    durationMs,
    filters.minDurationSeconds != null ? filters.minDurationSeconds * 1000 : null,
    filters.maxDurationSeconds != null ? filters.maxDurationSeconds * 1000 : null,
  );
}

function matchesLikes(count: number | null | undefined, filters: FilterState): boolean {
  return inRange(count, filters.minLikes, filters.maxLikes);
}

function matchesPlays(count: number | null | undefined, filters: FilterState): boolean {
  return inRange(count, filters.minPlays, filters.maxPlays);
}

/** Uploader (or playlist owner) and, on the feed, the reposter — any of them in range passes. */
function matchesFollowers(item: SCStreamItem, filters: FilterState): boolean {
  const sound = item?.track ?? item?.playlist;
  return anyInRange(
    [sound?.user?.followers_count, item?.user?.followers_count],
    filters.minFollowers,
    filters.maxFollowers,
  );
}

/**
 * The date SoundCloud shows on a track or playlist and orders lists by
 * (`display_date`, the release date). `created_at` is the raw upload timestamp,
 * which for scheduled or re-published sounds can be much older than what users
 * see, so it is only a fallback.
 */
export function soundDate(sound: SCTrack | SCPlaylist | undefined): string | undefined {
  return (sound as { display_date?: string } | undefined)?.display_date ?? sound?.created_at;
}

/**
 * Date range with the "any source" rule: the item's own time (post/repost time on
 * the feed) and the sound's shown date are both candidates, so a fresh repost of
 * an old track passes a "recent" range and also an "old" one. Unset bounds, or no
 * parseable candidate, pass.
 */
function matchesDateRange(item: SCStreamItem, filters: FilterState): boolean {
  const { start, endExclusive } = localDateRange(filters.createdFrom, filters.createdTo);
  if (start == null && endExclusive == null) return true;

  const sound = item?.track ?? item?.playlist;
  const times = [item?.created_at, soundDate(sound)]
    .map((iso) => (iso ? Date.parse(iso) : Number.NaN))
    .filter((time) => !Number.isNaN(time));
  if (times.length === 0) return true;

  return times.some(
    (time) => (start == null || time >= start) && (endExclusive == null || time < endExclusive),
  );
}

/**
 * Search + the per-sound checks. Duration and plays only exist on tracks; likes
 * exist on tracks and playlists; date and followers follow the "any source" rule
 * (item time or upload time; uploader/owner or reposter).
 */
function matchesSoundFilters(item: SCStreamItem, filters: FilterState): boolean {
  const sound = item?.track ?? item?.playlist;
  return (
    matchesSearchFilters(item, filters) &&
    matchesDateRange(item, filters) &&
    matchesDuration(item?.track?.duration, filters) &&
    matchesLikes(sound?.likes_count, filters) &&
    matchesPlays(item?.track?.playback_count, filters) &&
    matchesFollowers(item, filters)
  );
}

/**
 * Test whether a stream item passes all active filters.
 *
 * Rule for values an item offers from several sources (the Artist names, the
 * item time vs the upload time, the uploader's vs the reposter's followers):
 * any one source satisfying the filter is enough. Bare tag-page tracks wrapped by
 * `trackToStreamItem` have a single source for each.
 *
 * Playlists with tracks pass if the playlist itself OR any of its tracks match.
 * The playlist-level check uses the playlist's own metadata (search, date, `likes_count`,
 * owner's followers) and is disabled while a track-only filter (duration, plays) is
 * active, since a playlist total is not meaningful for those; every track is then
 * checked on its own (with the item's reposter and post time still in play).
 */
export function matchesFilters(item: SCStreamItem, filters: FilterState): boolean {
  const inner = item?.track ?? item?.playlist;
  if (!inner) return false;

  const tracks = item?.playlist?.tracks;
  const hasTracks = tracks != null && tracks.length > 0;

  if (hasTracks) {
    const trackOnlyFilterActive =
      isRangeActive(filters.minDurationSeconds, filters.maxDurationSeconds) ||
      isRangeActive(filters.minPlays, filters.maxPlays);
    const playlistPasses = !trackOnlyFilterActive && matchesSoundFilters(item, filters);
    const anyTrackPasses = tracks.some((track) => {
      // Keep the item's own fields (reposter for the Artist area, created_at) — only swap the sound.
      const trackItem: SCStreamItem = { ...item, track, playlist: undefined };
      return matchesSoundFilters(trackItem, filters);
    });
    return playlistPasses || anyTrackPasses;
  }

  return matchesSoundFilters(item, filters);
}

/** Filter an entire stream response (returns new object). */
export function filterStreamResponse(
  response: SCStreamResponse,
  filters: FilterState,
): SCStreamResponse {
  return {
    ...response,
    collection: response.collection?.filter((item) => matchesFilters(item, filters)),
  };
}

/**
 * Wrap a bare track (tag-page endpoints) as a stream item so every predicate
 * applies unchanged. The date SC shows for the track doubles as the item date.
 */
export function trackToStreamItem(track: SCTrack): SCStreamItem {
  return { type: "track", track, created_at: soundDate(track) };
}

/** Filter a bare-track collection (`/recent-tracks`, `/search/tracks`); pagination fields pass through. */
export function filterTrackResponse(
  response: SCTrackCollectionResponse,
  filters: FilterState,
): SCTrackCollectionResponse {
  return {
    ...response,
    collection: response.collection?.filter((track) =>
      matchesFilters(trackToStreamItem(track), filters),
    ),
  };
}

/**
 * Whether any filter is applied client-side (i.e. anything but the feed's
 * API-level activity types). Drives the page-size boost.
 */
export function hasClientSideFilters(filters: FilterState): boolean {
  return (
    isSearchActive(filters) ||
    isRangeActive(filters.minDurationSeconds, filters.maxDurationSeconds) ||
    Boolean(filters.createdFrom) ||
    Boolean(filters.createdTo) ||
    isRangeActive(filters.minLikes, filters.maxLikes) ||
    isRangeActive(filters.minPlays, filters.maxPlays) ||
    isRangeActive(filters.minFollowers, filters.maxFollowers)
  );
}
