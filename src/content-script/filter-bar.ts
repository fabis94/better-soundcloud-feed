export const FILTER_BAR_ID = "sc-feed-filter-bar";

/** "TrackPost" → "Track post", "PlaylistRepost" → "Playlist repost" */
export function formatActivityType(type: string): string {
  const spaced = type.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced[0] + spaced.slice(1).toLowerCase();
}

export function isFeedPage(): boolean {
  return location.pathname === "/" || location.pathname.includes("/feed");
}
