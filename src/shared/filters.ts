import type { SCStreamItem, SCStreamResponse, FilterState } from "./types";
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

/** Test whether a single stream item passes all active filters. */
export function matchesFilters(item: SCStreamItem, filters: FilterState): boolean {
  const inner = item?.track ?? item?.playlist;
  if (!inner) return false;

  // Search filter
  if (filters.searchMode === "simple") {
    if (filters.searchString) {
      const parsed = parseSearchString(filters.searchString);
      const text = getAllSearchableText(item);
      if (!matchesSearch(text, parsed, filters.searchOperator)) return false;
    }
  } else {
    // Extended mode: each non-empty field is matched against its extractor
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

  // Duration filter (tracks only — playlists pass through)
  const duration = item?.track?.duration;
  if (duration != null) {
    if (filters.minDurationSeconds != null && duration < filters.minDurationSeconds * 1000) return false;
    if (filters.maxDurationSeconds != null && duration > filters.maxDurationSeconds * 1000) return false;
  }

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
