export const FILTER_BAR_ID = "sc-feed-filter-bar";

/** "title" → "Title" — display label for a `SearchField` value. */
export function formatSearchField(field: string): string {
  return field.charAt(0).toUpperCase() + field.slice(1);
}

/** "TrackPost" → "Track post", "PlaylistRepost" → "Playlist repost" */
export function formatActivityType(type: string): string {
  const spaced = type.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced[0] + spaced.slice(1).toLowerCase();
}
