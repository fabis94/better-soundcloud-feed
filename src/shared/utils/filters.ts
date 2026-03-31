import type { SCStreamItem, SCStreamResponse, FilterState } from "../types";
import {
  parseSearchString,
  matchesSearch,
  getAllSearchableText,
  getTitleText,
  getDescriptionText,
  getGenreText,
  getArtistText,
  getLabelText,
} from "./search";

/** Check search filters against a single stream item. */
function matchesSearchFilters(item: SCStreamItem, filters: FilterState): boolean {
  if (filters.searchMode === "simple") {
    if (filters.searchString) {
      const parsed = parseSearchString(filters.searchString);
      const text = getAllSearchableText(item);
      if (!matchesSearch(text, parsed, filters.searchOperator)) return false;
    }
  } else {
    const fieldChecks: [string, string][] = [
      [filters.searchTitle, getTitleText(item)],
      [filters.searchDescription, getDescriptionText(item)],
      [filters.searchGenre, getGenreText(item)],
      [filters.searchArtist, getArtistText(item)],
      [filters.searchLabel, getLabelText(item)],
    ];

    const activeChecks = fieldChecks.filter(([raw]) => raw.length > 0);

    if (activeChecks.length > 0) {
      const results = activeChecks.map(([raw, text]) => {
        const parsed = parseSearchString(raw!);
        return matchesSearch(text!, parsed, filters.searchOperator);
      });

      if (filters.searchOperator === "and") {
        if (!results.every(Boolean)) return false;
      } else {
        if (!results.some(Boolean)) return false;
      }
    }
  }

  return true;
}

/** Check duration filter against a track's duration (ms). */
function matchesDuration(durationMs: number | null | undefined, filters: FilterState): boolean {
  if (durationMs == null) return true;
  if (filters.minDurationSeconds != null && durationMs < filters.minDurationSeconds * 1000)
    return false;
  if (filters.maxDurationSeconds != null && durationMs > filters.maxDurationSeconds * 1000)
    return false;
  return true;
}

/**
 * Test whether a stream item passes all active filters.
 * For playlists with tracks: passes if the playlist itself OR any of its tracks match
 * (search and duration are checked independently per candidate).
 */
export function matchesFilters(item: SCStreamItem, filters: FilterState): boolean {
  const inner = item?.track ?? item?.playlist;
  if (!inner) return false;

  const tracks = item?.playlist?.tracks;
  const hasTracks = tracks != null && tracks.length > 0;

  if (hasTracks) {
    // Search: playlist-level metadata OR any track's metadata can match.
    // Duration: only checked against individual tracks (playlist total duration is not meaningful).
    const hasDurationFilter =
      filters.minDurationSeconds != null || filters.maxDurationSeconds != null;
    const playlistPasses = matchesSearchFilters(item, filters) && !hasDurationFilter;
    const anyTrackPasses = tracks.some((track) => {
      const trackItem: SCStreamItem = { ...item, track, playlist: undefined };
      return matchesSearchFilters(trackItem, filters) && matchesDuration(track?.duration, filters);
    });
    return playlistPasses || anyTrackPasses;
  }

  // Single track
  if (!matchesSearchFilters(item, filters)) return false;
  if (!matchesDuration(item?.track?.duration, filters)) return false;
  return true;
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
