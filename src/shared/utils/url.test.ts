import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import {
  isStreamUrl,
  isRecentTracksUrl,
  isTagSearchUrl,
  extractUrl,
  withQueryParams,
  withActivityTypes,
  withBoostedLimit,
} from "./url";

describe("isStreamUrl", () => {
  it("matches stream API URLs", () => {
    expect(isStreamUrl("https://api-v2.soundcloud.com/stream?offset=abc")).toBe(true);
  });

  it("matches feed API URLs", () => {
    expect(isStreamUrl("https://api-v2.soundcloud.com/feed?limit=20")).toBe(true);
  });

  it("rejects non-stream URLs", () => {
    expect(isStreamUrl("https://api-v2.soundcloud.com/tracks/123")).toBe(false);
  });

  it("rejects unrelated URLs", () => {
    expect(isStreamUrl("https://example.com/stream")).toBe(false);
  });
});

describe("isRecentTracksUrl", () => {
  it("matches the tag page's recent tracks endpoint", () => {
    expect(
      isRecentTracksUrl("https://api-v2.soundcloud.com/recent-tracks/speed%20garage?limit=10"),
    ).toBe(true);
  });

  it("matches tags containing slashes", () => {
    expect(isRecentTracksUrl("https://api-v2.soundcloud.com/recent-tracks/drum/bass")).toBe(true);
  });

  it("rejects other hosts and endpoints", () => {
    expect(isRecentTracksUrl("https://example.com/recent-tracks/x")).toBe(false);
    expect(isRecentTracksUrl("https://api-v2.soundcloud.com/tracks/123")).toBe(false);
    expect(isRecentTracksUrl("https://api-v2.soundcloud.com/recent-tracks")).toBe(false);
  });
});

describe("isTagSearchUrl", () => {
  const TAG_SEARCH =
    "https://api-v2.soundcloud.com/search/tracks?q=*&filter.genre_or_tag=speed%20garage&sort=popular";

  it("matches a track search scoped to a tag", () => {
    expect(isTagSearchUrl(TAG_SEARCH)).toBe(true);
  });

  it("rejects the global search page's requests (no tag param)", () => {
    expect(isTagSearchUrl("https://api-v2.soundcloud.com/search/tracks?q=garage")).toBe(false);
    expect(
      isTagSearchUrl("https://api-v2.soundcloud.com/search/tracks?q=garage&filter.genre=house"),
    ).toBe(false);
  });

  it("rejects other search categories, paths and hosts", () => {
    expect(
      isTagSearchUrl("https://api-v2.soundcloud.com/search/playlists?q=*&filter.genre_or_tag=x"),
    ).toBe(false);
    expect(
      isTagSearchUrl("https://api-v2.soundcloud.com/search/tracks_x?filter.genre_or_tag=x"),
    ).toBe(false);
    expect(isTagSearchUrl("https://example.com/search/tracks?filter.genre_or_tag=x")).toBe(false);
  });

  it("rejects unparseable input", () => {
    expect(isTagSearchUrl("not a url")).toBe(false);
  });
});

describe("extractUrl", () => {
  it("returns string input as-is", () => {
    expect(extractUrl("https://example.com")).toBe("https://example.com");
  });

  it("converts URL object to string", () => {
    const url = new URL("https://example.com/path");
    expect(extractUrl(url)).toBe("https://example.com/path");
  });
});

describe("withQueryParams", () => {
  const BASE = "https://api-v2.soundcloud.com/search/tracks?q=*&limit=10";

  it("sets new params and keeps existing ones", () => {
    const parsed = new URL(withQueryParams(BASE, { "filter.duration": "epic" }));
    expect(parsed.searchParams.get("filter.duration")).toBe("epic");
    expect(parsed.searchParams.get("q")).toBe("*");
    expect(parsed.searchParams.get("limit")).toBe("10");
  });

  it("overwrites existing values", () => {
    const parsed = new URL(withQueryParams(BASE, { limit: "50" }));
    expect(parsed.searchParams.get("limit")).toBe("50");
  });

  it("deletes params given null", () => {
    const parsed = new URL(
      withQueryParams(`${BASE}&filter.created_at=last_hour`, { "filter.created_at": null }),
    );
    expect(parsed.searchParams.has("filter.created_at")).toBe(false);
    expect(parsed.searchParams.get("q")).toBe("*");
  });

  it("deleting an absent param is a no-op", () => {
    expect(withQueryParams(BASE, { nope: null })).toBe(new URL(BASE).toString());
  });

  it("is idempotent", () => {
    const once = withQueryParams(BASE, { a: "1", b: null });
    expect(withQueryParams(once, { a: "1", b: null })).toBe(once);
  });
});

describe("withActivityTypes", () => {
  it("sets comma-separated activity types on a URL", () => {
    const result = withActivityTypes("https://api-v2.soundcloud.com/stream", [
      "TrackPost",
      "TrackRepost",
    ]);
    const parsed = new URL(result);
    expect(parsed.searchParams.get("activityTypes")).toBe("TrackPost,TrackRepost");
  });

  it("replaces existing activity types", () => {
    const result = withActivityTypes(
      "https://api-v2.soundcloud.com/stream?activityTypes=PlaylistPost",
      ["TrackPost"],
    );
    const parsed = new URL(result);
    expect(parsed.searchParams.get("activityTypes")).toBe("TrackPost");
  });

  it("handles single activity type", () => {
    const result = withActivityTypes("https://api-v2.soundcloud.com/stream", ["PlaylistPost"]);
    const parsed = new URL(result);
    expect(parsed.searchParams.get("activityTypes")).toBe("PlaylistPost");
  });

  it("sets empty string when array is empty", () => {
    const result = withActivityTypes(
      "https://api-v2.soundcloud.com/stream?activityTypes=TrackPost",
      [],
    );
    const parsed = new URL(result);
    expect(parsed.searchParams.get("activityTypes")).toBe("");
  });

  it("preserves other query params", () => {
    const result = withActivityTypes("https://api-v2.soundcloud.com/stream?limit=20&offset=0", [
      "TrackPost",
    ]);
    const parsed = new URL(result);
    expect(parsed.searchParams.get("limit")).toBe("20");
    expect(parsed.searchParams.get("offset")).toBe("0");
    expect(parsed.searchParams.get("activityTypes")).toBe("TrackPost");
  });
});

describe("withBoostedLimit", () => {
  const limitOf = (url: string) => new URL(url).searchParams.get("limit");

  it("multiplies the limit of a first-page request", () => {
    expect(limitOf(withBoostedLimit("https://x.test/a?limit=10&offset=0", 2, 200))).toBe("20");
  });

  it("treats a missing offset as the first page", () => {
    expect(limitOf(withBoostedLimit("https://x.test/a?limit=10", 2, 200))).toBe("20");
  });

  it("caps the boosted limit", () => {
    expect(limitOf(withBoostedLimit("https://x.test/a?limit=30&offset=0", 2, 50))).toBe("50");
  });

  it("leaves later pages untouched (they already echo the boosted value)", () => {
    const numeric = "https://x.test/a?limit=20&offset=20";
    expect(withBoostedLimit(numeric, 2, 200)).toBe(numeric);
    const cursor =
      "https://x.test/a?offset=2026-09-21T21%3A22%3A13.000Z%2Crecent-content-tracks-by-tag%2Csoundcloud%3Atracks%3A1&limit=20";
    expect(withBoostedLimit(cursor, 2, 200)).toBe(cursor);
  });

  it("never invents a limit", () => {
    const noLimit = "https://x.test/a?offset=0";
    expect(withBoostedLimit(noLimit, 2, 200)).toBe(noLimit);
    const bad = "https://x.test/a?limit=abc&offset=0";
    expect(withBoostedLimit(bad, 2, 200)).toBe(bad);
    const zero = "https://x.test/a?limit=0";
    expect(withBoostedLimit(zero, 2, 200)).toBe(zero);
  });

  it("keeps the other params", () => {
    const parsed = new URL(withBoostedLimit("https://x.test/a?q=*&limit=10&offset=0", 2, 200));
    expect(parsed.searchParams.get("q")).toBe("*");
    expect(parsed.searchParams.get("offset")).toBe("0");
  });
});
