import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { INTERCEPT_TARGETS, resolveInterceptTarget } from "./targets";
import { PageKind } from "../../shared/pages";
import { parseLocalDate } from "../../shared/utils/date";
import type { SCStreamResponse, SCTrackCollectionResponse } from "../../shared/types";
import {
  buildFilters,
  buildStreamItem,
  buildStreamResponse,
  buildTrack,
  buildTrackCollectionResponse,
} from "../../test/factories";

const STREAM = "https://api-v2.soundcloud.com/stream?limit=10&offset=0&linked_partitioning=1";
const RECENT =
  "https://api-v2.soundcloud.com/recent-tracks/speed%20garage?limit=10&offset=0&linked_partitioning=1";
const SEARCH =
  "https://api-v2.soundcloud.com/search/tracks?q=*&filter.genre_or_tag=speed%20garage&sort=popular&limit=10&offset=0";

const params = (url: string) => new URL(url).searchParams;
const HOUR = 60 * 60 * 1000;

describe("resolveInterceptTarget", () => {
  it("matches the stream on the feed only", () => {
    expect(resolveInterceptTarget(STREAM, "/feed")?.kind).toBe(PageKind.Feed);
    expect(resolveInterceptTarget(STREAM, "/tags/x")).toBeNull();
    expect(resolveInterceptTarget(STREAM, "/rinsefm")).toBeNull();
  });

  it("ignores tag endpoints on the feed", () => {
    expect(resolveInterceptTarget(RECENT, "/feed")).toBeNull();
    expect(resolveInterceptTarget(SEARCH, "/feed")).toBeNull();
  });

  it("matches both tag endpoints on either tag tab (shared store, SC may fetch before pushState)", () => {
    expect(resolveInterceptTarget(RECENT, "/tags/x")?.kind).toBe(PageKind.TagRecent);
    expect(resolveInterceptTarget(SEARCH, "/tags/x")?.kind).toBe(PageKind.TagPopular);
    expect(resolveInterceptTarget(RECENT, "/tags/x/popular-tracks")?.kind).toBe(PageKind.TagRecent);
    expect(resolveInterceptTarget(SEARCH, "/tags/x/popular-tracks")?.kind).toBe(
      PageKind.TagPopular,
    );
  });

  it("never intercepts on the playlists tab or unrelated pages", () => {
    for (const url of [STREAM, RECENT, SEARCH]) {
      expect(resolveInterceptTarget(url, "/tags/x/playlists")).toBeNull();
      expect(resolveInterceptTarget(url, "/search/sounds")).toBeNull();
      expect(resolveInterceptTarget(url, "/")).toBeNull();
    }
  });

  it("ignores a track search without the tag param even on a tag page", () => {
    expect(
      resolveInterceptTarget("https://api-v2.soundcloud.com/search/tracks?q=garage", "/tags/x"),
    ).toBeNull();
  });
});

describe("feed target", () => {
  const target = INTERCEPT_TARGETS[PageKind.Feed];

  it("sets activityTypes and keeps SC's page size without client filters", () => {
    const url = target.buildRequestUrl(STREAM, buildFilters({ activityTypes: ["TrackPost"] }));
    expect(params(url).get("activityTypes")).toBe("TrackPost");
    expect(params(url).get("limit")).toBe("10");
  });

  it("doubles the first-page limit when a client-side filter is active", () => {
    const url = target.buildRequestUrl(STREAM, buildFilters({ searchString: "garage" }));
    expect(params(url).get("limit")).toBe("20");
    expect(params(url).get("activityTypes")).toBe("TrackPost,TrackRepost,PlaylistPost");
  });

  it("filters stream items", () => {
    const response = buildStreamResponse({
      collection: [
        buildStreamItem({ track: buildTrack({ title: "Keep" }) }),
        buildStreamItem({ track: buildTrack({ title: "Drop" }) }),
      ],
    });
    const result = target.filterResponse(
      response,
      buildFilters({ searchString: "keep" }),
    ) as SCStreamResponse;
    expect(result.collection).toHaveLength(1);
    expect(result.collection?.[0]?.track?.title).toBe("Keep");
  });
});

describe("tagRecent target", () => {
  const target = INTERCEPT_TARGETS[PageKind.TagRecent];

  it("leaves the request untouched without client filters", () => {
    expect(target.buildRequestUrl(RECENT, buildFilters())).toBe(RECENT);
  });

  it("boosts the first page and caps at the endpoint's maximum of 50", () => {
    expect(params(target.buildRequestUrl(RECENT, buildFilters({ minLikes: 1 }))).get("limit")).toBe(
      "20",
    );
    const big = RECENT.replace("limit=10", "limit=40");
    expect(params(target.buildRequestUrl(big, buildFilters({ minLikes: 1 }))).get("limit")).toBe(
      "50",
    );
  });

  it("does not touch cursor pages", () => {
    const next =
      "https://api-v2.soundcloud.com/recent-tracks/speed%20garage?offset=2026-09-21T21%3A22%3A13.000Z%2Crecent-content-tracks-by-tag%2Csoundcloud%3Atracks%3A1&limit=20";
    expect(target.buildRequestUrl(next, buildFilters({ minLikes: 1 }))).toBe(next);
  });

  it("filters bare tracks", () => {
    const response = buildTrackCollectionResponse({
      collection: [buildTrack({ likes_count: 5 }), buildTrack({ likes_count: 50 })],
      next_href: "next",
    });
    const result = target.filterResponse(
      response,
      buildFilters({ minLikes: 10 }),
    ) as SCTrackCollectionResponse;
    expect(result.collection).toHaveLength(1);
    expect(result.collection?.[0]?.likes_count).toBe(50);
    expect(result.next_href).toBe("next");
  });
});

describe("tagPopular target", () => {
  const target = INTERCEPT_TARGETS[PageKind.TagPopular];
  const now = parseLocalDate("2026-09-22")! + 2 * HOUR;

  it("adds no server-side filters and no boost without client filters", () => {
    const url = target.buildRequestUrl(SEARCH, buildFilters(), now);
    expect(params(url).has("filter.created_at")).toBe(false);
    expect(params(url).has("filter.duration")).toBe(false);
    expect(params(url).get("limit")).toBe("10");
    expect(params(url).get("filter.genre_or_tag")).toBe("speed garage");
    expect(params(url).get("q")).toBe("*");
  });

  it("strips stale filter params SC echoed back in next_href", () => {
    const echoed = `${SEARCH}&filter.created_at=last_hour&filter.duration=short`;
    const url = target.buildRequestUrl(echoed, buildFilters(), now);
    expect(params(url).has("filter.created_at")).toBe(false);
    expect(params(url).has("filter.duration")).toBe(false);
  });

  it("derives the created_at bucket from `from` and still boosts the page", () => {
    const url = target.buildRequestUrl(SEARCH, buildFilters({ createdFrom: "2026-09-21" }), now);
    expect(params(url).get("filter.created_at")).toBe("last_week");
    expect(params(url).get("limit")).toBe("20");
  });

  it("derives the duration bucket only when the range fits one band", () => {
    const fits = target.buildRequestUrl(
      SEARCH,
      buildFilters({ minDurationSeconds: 120, maxDurationSeconds: 600 }),
      now,
    );
    expect(params(fits).get("filter.duration")).toBe("medium");

    const spans = target.buildRequestUrl(
      SEARCH,
      buildFilters({ minDurationSeconds: 60, maxDurationSeconds: 600 }),
      now,
    );
    expect(params(spans).has("filter.duration")).toBe(false);
    expect(params(spans).get("limit")).toBe("20");
  });

  it("filters bare tracks", () => {
    const response = buildTrackCollectionResponse({
      collection: [buildTrack({ title: "Keep" }), buildTrack({ title: "Drop" })],
      total_results: 2,
    });
    const result = target.filterResponse(
      response,
      buildFilters({ searchString: "keep" }),
    ) as SCTrackCollectionResponse;
    expect(result.collection).toHaveLength(1);
    expect(result.total_results).toBe(2);
  });
});
