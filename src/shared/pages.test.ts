import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { PageKind, FilterStoreKey, PAGE_CONFIGS, resolvePageKind } from "./pages";

describe("resolvePageKind", () => {
  const supported: [string, PageKind][] = [
    ["/feed", PageKind.Feed],
    ["/feed/", PageKind.Feed],
    ["/tags/x", PageKind.TagRecent],
    ["/tags/x/", PageKind.TagRecent],
    ["/tags/x/recent-tracks", PageKind.TagRecent],
    ["/tags/x/popular-tracks", PageKind.TagPopular],
    ["/tags/speed%20garage", PageKind.TagRecent],
    ["/tags/speed%20garage/popular-tracks", PageKind.TagPopular],
    ["/tags/dance%20&%20edm/recent-tracks", PageKind.TagRecent],
    // tags may contain slashes — only a known last segment is a subpage
    ["/tags/drum/bass", PageKind.TagRecent],
    ["/tags/drum/bass/popular-tracks", PageKind.TagPopular],
  ];

  it.each(supported)("%s → %s", (pathname, kind) => {
    expect(resolvePageKind(pathname)).toBe(kind);
  });

  const unsupported = [
    "/tags/x/playlists",
    "/tags/drum/bass/playlists",
    "/tags",
    "/tags/",
    "/",
    "/discover/feed",
    "/feed/something",
    "/rinsefm",
    "/you/likes",
    "/search/sounds",
  ];

  it.each(unsupported)("%s → null", (pathname) => {
    expect(resolvePageKind(pathname)).toBeNull();
  });
});

describe("PAGE_CONFIGS", () => {
  it("feed uses its own store and shows activity types", () => {
    const feed = PAGE_CONFIGS[PageKind.Feed];
    expect(feed.storeKey).toBe(FilterStoreKey.Feed);
    expect(feed.ui.showActivityTypes).toBe(true);
    expect(feed.ui.dateLabel).toBe("Date");
  });

  it("both tag tabs share the tag store and hide activity types", () => {
    for (const kind of [PageKind.TagRecent, PageKind.TagPopular]) {
      const config = PAGE_CONFIGS[kind];
      expect(config.storeKey).toBe(FilterStoreKey.Tags);
      expect(config.ui.showActivityTypes).toBe(false);
      expect(config.ui.dateLabel).toBe("Uploaded");
    }
  });

  it("covers every page kind", () => {
    expect(Object.keys(PAGE_CONFIGS).sort()).toEqual(Object.values(PageKind).sort());
  });
});
