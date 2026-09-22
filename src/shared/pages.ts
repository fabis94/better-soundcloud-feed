/**
 * Page kinds the extension knows how to filter. Resolved from `location.pathname`
 * in both realms; every per-page difference hangs off this key
 * (`PAGE_CONFIGS` here, `INTERCEPT_TARGETS` in the injected script).
 */
export const PageKind = {
  Feed: "feed",
  TagRecent: "tagRecent",
  TagPopular: "tagPopular",
} as const;

export type PageKind = (typeof PageKind)[keyof typeof PageKind];

/** localStorage keys of the persisted filter states. Feed and tag pages are kept apart. */
export const FilterStoreKey = {
  Feed: "bscf_filters",
  Tags: "bscf_filters_tags",
} as const;

export type FilterStoreKey = (typeof FilterStoreKey)[keyof typeof FilterStoreKey];

export interface PageUiConfig {
  /** Activity types are a feed-only, API-level filter. */
  showActivityTypes: boolean;
  /** Row label for the date range: the feed matches post/repost time or upload time, tag tracks only have an upload date. */
  dateLabel: string;
  /** Extended-mode Artist placeholder — reposters only exist on the feed. */
  artistPlaceholder: string;
}

interface PageConfig {
  storeKey: FilterStoreKey;
  ui: PageUiConfig;
}

const TAG_UI: PageUiConfig = {
  showActivityTypes: false,
  dateLabel: "Uploaded",
  artistPlaceholder: "artist filter",
};

export const PAGE_CONFIGS: Record<PageKind, PageConfig> = {
  [PageKind.Feed]: {
    storeKey: FilterStoreKey.Feed,
    ui: {
      showActivityTypes: true,
      dateLabel: "Date",
      artistPlaceholder: "artist/reposter filter",
    },
  },
  [PageKind.TagRecent]: { storeKey: FilterStoreKey.Tags, ui: TAG_UI },
  [PageKind.TagPopular]: { storeKey: FilterStoreKey.Tags, ui: TAG_UI },
};

/**
 * Mirrors SC's `/tags/:tag` route: the last segment is a subpage only when it is
 * `recent-tracks`, `popular-tracks` or `playlists`; everything else (slashes
 * included) is the tag. `pathname` stays percent-encoded — only segment names
 * matter. The Playlists tab is deliberately unsupported (→ `null`).
 */
export function resolvePageKind(pathname: string): PageKind | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 && segments[0] === "feed") return PageKind.Feed;
  if (segments[0] !== "tags" || segments.length < 2) return null;

  switch (segments[segments.length - 1]) {
    case "popular-tracks":
      return PageKind.TagPopular;
    case "playlists":
      return null;
    default:
      // "recent-tracks" or the tag itself (the default tab)
      return PageKind.TagRecent;
  }
}
