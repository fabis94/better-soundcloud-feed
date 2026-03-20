import type { SCStreamItem, SCStreamResponse, FilterState } from "./types";

/** Test whether a single stream item passes all active filters. */
export function matchesFilters(item: SCStreamItem, filters: FilterState): boolean {
  if (!filters.types.includes(item.type)) return false;

  const inner = item.track ?? item.playlist;
  if (!inner) return false;

  // Artist exclusion
  const artistPermalink = inner.user.permalink.toLowerCase();
  if (filters.excludeArtists.includes(artistPermalink)) return false;

  // Also check poster/reposter
  const posterPermalink = item.user.permalink.toLowerCase();
  if (filters.excludeArtists.includes(posterPermalink)) return false;

  // Genre/tag whitelist (if specified, must match at least one)
  if (filters.genres.length > 0) {
    const genre = (inner.genre ?? "").toLowerCase();
    const tags = inner.tag_list.toLowerCase();
    const hasMatch = filters.genres.some((g) => genre.includes(g) || tags.includes(g));
    if (!hasMatch) return false;
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
    collection: response.collection.filter((item) => matchesFilters(item, filters)),
  };
}
