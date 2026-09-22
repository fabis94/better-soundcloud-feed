import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import {
  matchesFilters,
  filterStreamResponse,
  filterTrackResponse,
  trackToStreamItem,
  hasClientSideFilters,
} from "./filters";
import {
  buildStreamItem,
  buildTrack,
  buildPlaylist,
  buildUser,
  buildFilters,
  buildStreamResponse,
  buildTrackCollectionResponse,
} from "../../test/factories";
import { SearchField } from "../types";

describe("matchesFilters", () => {
  describe("simple search", () => {
    it("passes all items when search is empty", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Anything" }) });
      const filters = buildFilters({ searchString: "" });
      expect(matchesFilters(item, filters)).toBe(true);
    });

    it("matches by track title", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "UK Garage Mix" }) });
      expect(matchesFilters(item, buildFilters({ searchString: "garage" }))).toBe(true);
      expect(matchesFilters(item, buildFilters({ searchString: "techno" }))).toBe(false);
    });

    it("matches by genre", () => {
      const item = buildStreamItem({ track: buildTrack({ genre: "House" }) });
      expect(matchesFilters(item, buildFilters({ searchString: "house" }))).toBe(true);
    });

    it("matches by artist username", () => {
      const item = buildStreamItem({
        track: buildTrack({ user: buildUser({ username: "CoolDJ" }) }),
      });
      expect(matchesFilters(item, buildFilters({ searchString: "cooldj" }))).toBe(true);
    });

    it("matches by reposter username", () => {
      const item = buildStreamItem({
        user: buildUser({ username: "ReposterGuy" }),
        track: buildTrack(),
      });
      expect(matchesFilters(item, buildFilters({ searchString: "reposterguy" }))).toBe(true);
    });

    it("matches by label name", () => {
      const item = buildStreamItem({ track: buildTrack({ label_name: "Cool Records" }) });
      expect(matchesFilters(item, buildFilters({ searchString: "cool records" }))).toBe(true);
    });

    it("matches by publisher artist", () => {
      const item = buildStreamItem({
        track: buildTrack({
          publisher_metadata: {
            id: 1,
            urn: "x",
            artist: "Famous Artist",
            contains_music: true,
            isrc: "x",
            explicit: false,
          },
        }),
      });
      expect(matchesFilters(item, buildFilters({ searchString: "famous" }))).toBe(true);
    });

    it("OR operator: any term matches", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage Track" }) });
      const filters = buildFilters({ searchString: "techno, garage", searchOperator: "or" });
      expect(matchesFilters(item, filters)).toBe(true);
    });

    it("AND operator: all terms must match", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "UK Garage Mix" }) });
      expect(
        matchesFilters(item, buildFilters({ searchString: "uk, garage", searchOperator: "and" })),
      ).toBe(true);
      expect(
        matchesFilters(item, buildFilters({ searchString: "uk, techno", searchOperator: "and" })),
      ).toBe(false);
    });

    it("exclude terms hide items", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Spammer Track" }) });
      expect(matchesFilters(item, buildFilters({ searchString: "-spammer" }))).toBe(false);
    });

    it("wildcard matching works", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Epic Deep House" }) });
      expect(matchesFilters(item, buildFilters({ searchString: "epic*house" }))).toBe(true);
    });
  });

  describe("simple search fields", () => {
    // Modelled on a real feed item: genre is Techno, but the promo description
    // mentions "house-tempo" and "bass-heavy".
    const wreck = () =>
      buildStreamItem({
        track: buildTrack({
          title: "Peverelist - Wreck III",
          genre: "Techno",
          description: "a brooding house-tempo cut ... the bass-heavy jack of 'Wreck III'",
          label_name: "Livity Sound Recordings",
          user: buildUser({ username: "Livity Sound" }),
        }),
      });
    const withoutDescription = Object.values(SearchField).filter(
      (f) => f !== SearchField.Description,
    );

    it("matches via the description when all fields are searched (default)", () => {
      const filters = buildFilters({ searchString: "house,garage,bass", searchOperator: "or" });
      expect(matchesFilters(wreck(), filters)).toBe(true);
    });

    it("rejects the same item once description is deselected", () => {
      const filters = buildFilters({
        searchString: "house,garage,bass",
        searchOperator: "or",
        searchFields: withoutDescription,
      });
      expect(matchesFilters(wreck(), filters)).toBe(false);
    });

    it("still matches on the fields that remain selected", () => {
      const filters = buildFilters({
        searchString: "techno",
        searchFields: [SearchField.Genre],
      });
      expect(matchesFilters(wreck(), filters)).toBe(true);
    });

    it("AND operator: terms may come from different selected fields", () => {
      const filters = buildFilters({
        searchString: "techno,livity",
        searchOperator: "and",
        searchFields: [SearchField.Genre, SearchField.Artist],
      });
      expect(matchesFilters(wreck(), filters)).toBe(true);
    });

    it("AND operator: fails when a term only exists in a deselected field", () => {
      const filters = buildFilters({
        searchString: "techno,livity",
        searchOperator: "and",
        searchFields: [SearchField.Genre],
      });
      expect(matchesFilters(wreck(), filters)).toBe(false);
    });

    it("excludes only apply to selected fields", () => {
      const all = buildFilters({ searchString: "-house" });
      const noDesc = buildFilters({ searchString: "-house", searchFields: withoutDescription });
      expect(matchesFilters(wreck(), all)).toBe(false);
      expect(matchesFilters(wreck(), noDesc)).toBe(true);
    });

    it("ignores the search entirely when no fields are selected", () => {
      const filters = buildFilters({ searchString: "garage", searchFields: [] });
      expect(matchesFilters(wreck(), filters)).toBe(true);
    });

    it("still applies duration when no fields are selected", () => {
      const filters = buildFilters({
        searchString: "garage",
        searchFields: [],
        maxDurationSeconds: 60,
      });
      expect(matchesFilters(wreck(), filters)).toBe(false);
    });

    it("applies selected fields to tracks inside playlists", () => {
      const item = buildStreamItem({
        type: "playlist",
        track: undefined,
        playlist: buildPlaylist({
          title: "Some EP",
          tracks: [buildTrack({ title: "Roller", description: "pure garage pressure" })],
        }),
      });
      const all = buildFilters({ searchString: "garage" });
      const noDesc = buildFilters({ searchString: "garage", searchFields: withoutDescription });
      expect(matchesFilters(item, all)).toBe(true);
      expect(matchesFilters(item, noDesc)).toBe(false);
    });
  });

  describe("extended search", () => {
    it("ignores simple-mode searchFields", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage", genre: "Techno" }) });
      const filters = buildFilters({
        searchMode: "extended",
        searchTitle: "garage",
        searchFields: [],
      });
      expect(matchesFilters(item, filters)).toBe(true);
      expect(matchesFilters(item, { ...filters, searchTitle: "house" })).toBe(false);
    });

    it("matches the release artist under Artist, not Label", () => {
      const item = buildStreamItem({
        track: buildTrack({
          user: buildUser({ username: "Livity Sound" }),
          label_name: "Livity Sound Recordings",
          publisher_metadata: {
            id: 1,
            urn: "x",
            artist: "Peverelist",
            contains_music: true,
            isrc: "x",
            explicit: false,
          },
        }),
      });
      const byArtist = buildFilters({ searchMode: "extended", searchArtist: "peverelist" });
      const byLabel = buildFilters({ searchMode: "extended", searchLabel: "peverelist" });
      expect(matchesFilters(item, byArtist)).toBe(true);
      expect(matchesFilters(item, byLabel)).toBe(false);
    });

    it("matches by title field only", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage", genre: "Techno" }) });
      const filters = buildFilters({ searchMode: "extended", searchTitle: "garage" });
      expect(matchesFilters(item, filters)).toBe(true);
    });

    it("does not cross-match fields", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage", genre: "House" }) });
      const filters = buildFilters({ searchMode: "extended", searchTitle: "house" });
      expect(matchesFilters(item, filters)).toBe(false);
    });

    it("AND operator: all non-empty fields must match", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage", genre: "House" }) });
      const filters = buildFilters({
        searchMode: "extended",
        searchOperator: "and",
        searchTitle: "garage",
        searchGenre: "house",
      });
      expect(matchesFilters(item, filters)).toBe(true);
    });

    it("AND operator: fails if any field doesn't match", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage", genre: "House" }) });
      const filters = buildFilters({
        searchMode: "extended",
        searchOperator: "and",
        searchTitle: "garage",
        searchGenre: "techno",
      });
      expect(matchesFilters(item, filters)).toBe(false);
    });

    it("OR operator: passes if any field matches", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage", genre: "House" }) });
      const filters = buildFilters({
        searchMode: "extended",
        searchOperator: "or",
        searchTitle: "techno",
        searchGenre: "house",
      });
      expect(matchesFilters(item, filters)).toBe(true);
    });

    it("empty fields are ignored", () => {
      const item = buildStreamItem({ track: buildTrack({ title: "Garage" }) });
      const filters = buildFilters({
        searchMode: "extended",
        searchTitle: "garage",
        searchGenre: "",
        searchArtist: "",
      });
      expect(matchesFilters(item, filters)).toBe(true);
    });
  });

  describe("duration filter", () => {
    it("rejects track shorter than min", () => {
      const item = buildStreamItem({ track: buildTrack({ duration: 60000 }) }); // 60s
      expect(matchesFilters(item, buildFilters({ minDurationSeconds: 120 }))).toBe(false);
    });

    it("rejects track longer than max", () => {
      const item = buildStreamItem({ track: buildTrack({ duration: 600000 }) }); // 600s
      expect(matchesFilters(item, buildFilters({ maxDurationSeconds: 300 }))).toBe(false);
    });

    it("passes track within range", () => {
      const item = buildStreamItem({ track: buildTrack({ duration: 180000 }) }); // 180s
      expect(
        matchesFilters(item, buildFilters({ minDurationSeconds: 60, maxDurationSeconds: 300 })),
      ).toBe(true);
    });

    it("null min/max means no constraint", () => {
      const item = buildStreamItem({ track: buildTrack({ duration: 1000 }) });
      expect(
        matchesFilters(item, buildFilters({ minDurationSeconds: null, maxDurationSeconds: null })),
      ).toBe(true);
    });

    it("playlists without tracks are not filtered by duration", () => {
      const item = buildStreamItem({ type: "playlist" });
      expect(matchesFilters(item, buildFilters({ minDurationSeconds: 9999 }))).toBe(true);
    });

    it("playlist passes if any track fits duration", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          tracks: [buildTrack({ duration: 60000 }), buildTrack({ duration: 300000 })],
        }),
      });
      expect(matchesFilters(item, buildFilters({ minDurationSeconds: 240 }))).toBe(true);
    });

    it("playlist rejected if no track fits duration", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          tracks: [buildTrack({ duration: 60000 }), buildTrack({ duration: 90000 })],
        }),
      });
      expect(matchesFilters(item, buildFilters({ minDurationSeconds: 240 }))).toBe(false);
    });
  });

  describe("playlist track fallback", () => {
    it("playlist passes if any track matches search", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          title: "Random Playlist",
          tracks: [buildTrack({ title: "Garage Vibes" }), buildTrack({ title: "Ambient Drone" })],
        }),
      });
      expect(matchesFilters(item, buildFilters({ searchString: "garage" }))).toBe(true);
    });

    it("playlist passes if playlist itself matches search", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          title: "Best Garage Tunes",
          tracks: [buildTrack({ title: "Track 1" }), buildTrack({ title: "Track 2" })],
        }),
      });
      expect(matchesFilters(item, buildFilters({ searchString: "garage" }))).toBe(true);
    });

    it("playlist rejected if neither playlist nor tracks match", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          title: "My Playlist",
          tracks: [buildTrack({ title: "Track 1" }), buildTrack({ title: "Track 2" })],
        }),
      });
      expect(matchesFilters(item, buildFilters({ searchString: "garage" }))).toBe(false);
    });
  });

  it("rejects items with no inner track or playlist", () => {
    const item = buildStreamItem({ type: "track" });
    delete item.track;
    expect(matchesFilters(item, buildFilters())).toBe(false);
  });
});

describe("filterStreamResponse", () => {
  it("returns a new response with only matching items", () => {
    const response = buildStreamResponse({
      collection: [
        buildStreamItem({ track: buildTrack({ title: "Garage" }) }),
        buildStreamItem({ track: buildTrack({ title: "Techno" }) }),
        buildStreamItem({ track: buildTrack({ title: "House" }) }),
      ],
    });
    const filters = buildFilters({ searchString: "garage, house", searchOperator: "or" });
    const result = filterStreamResponse(response, filters);
    expect(result.collection).toHaveLength(2);
  });

  it("preserves next_href and query_urn", () => {
    const response = buildStreamResponse({
      next_href: "https://api-v2.soundcloud.com/stream?offset=abc",
      query_urn: "some-urn",
    });
    const result = filterStreamResponse(response, buildFilters());
    expect(result.next_href).toBe(response.next_href);
    expect(result.query_urn).toBe(response.query_urn);
  });

  it("does not mutate the original response", () => {
    const response = buildStreamResponse({
      collection: [
        buildStreamItem({ track: buildTrack({ title: "Keep" }) }),
        buildStreamItem({ track: buildTrack({ title: "Remove" }) }),
      ],
    });
    const originalLength = response.collection!.length;
    filterStreamResponse(response, buildFilters({ searchString: "keep" }));
    expect(response.collection).toHaveLength(originalLength);
  });
});

// --- date / likes / plays ---

/** ISO timestamp for a local calendar day at the given hour. */
const localIso = (y: number, m: number, d: number, h = 12): string =>
  new Date(y, m - 1, d, h).toISOString();

describe("date range", () => {
  // A plain track post: the post time and the track's upload time are the same moment.
  const itemOn = (created_at: string) =>
    buildStreamItem({ created_at, track: buildTrack({ created_at }) });

  it("passes everything when no bound is set", () => {
    expect(matchesFilters(itemOn(localIso(2010, 1, 1)), buildFilters())).toBe(true);
  });

  it("`from` is inclusive of the whole day", () => {
    const filters = buildFilters({ createdFrom: "2026-09-21" });
    expect(matchesFilters(itemOn(localIso(2026, 9, 21, 0)), filters)).toBe(true);
    expect(matchesFilters(itemOn(localIso(2026, 9, 25)), filters)).toBe(true);
    expect(matchesFilters(itemOn(localIso(2026, 9, 20, 23)), filters)).toBe(false);
  });

  it("`to` is inclusive of the whole day", () => {
    const filters = buildFilters({ createdTo: "2026-09-21" });
    expect(matchesFilters(itemOn(localIso(2026, 9, 21, 23)), filters)).toBe(true);
    expect(matchesFilters(itemOn(localIso(2026, 9, 22, 0)), filters)).toBe(false);
  });

  it("combines both bounds", () => {
    const filters = buildFilters({ createdFrom: "2026-09-01", createdTo: "2026-09-30" });
    expect(matchesFilters(itemOn(localIso(2026, 9, 15)), filters)).toBe(true);
    expect(matchesFilters(itemOn(localIso(2026, 8, 31)), filters)).toBe(false);
    expect(matchesFilters(itemOn(localIso(2026, 10, 1)), filters)).toBe(false);
  });

  it("passes when either the post/repost time or the upload time is in range", () => {
    const recent = buildFilters({ createdFrom: "2026-09-21" });
    const old = buildFilters({ createdTo: "2020-01-01" });
    const repostOfOldTrack = buildStreamItem({
      type: "track-repost",
      created_at: localIso(2026, 9, 22),
      track: buildTrack({ created_at: localIso(2015, 1, 1) }),
    });
    // repost time satisfies "recent", upload time satisfies "old"
    expect(matchesFilters(repostOfOldTrack, recent)).toBe(true);
    expect(matchesFilters(repostOfOldTrack, old)).toBe(true);

    const between = buildFilters({ createdFrom: "2018-01-01", createdTo: "2020-01-01" });
    expect(matchesFilters(repostOfOldTrack, between)).toBe(false);
  });

  it("checks playlist posts by their post time and by each track's upload time", () => {
    const old = buildFilters({ createdTo: "2020-01-01" });
    const freshPlaylist = buildStreamItem({
      type: "playlist",
      created_at: localIso(2026, 9, 22),
      playlist: buildPlaylist({ tracks: [buildTrack({ created_at: localIso(2026, 9, 1) })] }),
    });
    expect(matchesFilters(freshPlaylist, old)).toBe(false);

    const freshPlaylistWithOldTrack = buildStreamItem({
      type: "playlist",
      created_at: localIso(2026, 9, 22),
      playlist: buildPlaylist({ tracks: [buildTrack({ created_at: localIso(2015, 1, 1) })] }),
    });
    expect(matchesFilters(freshPlaylistWithOldTrack, old)).toBe(true);
  });

  it("passes items with no parseable date at all", () => {
    const filters = buildFilters({ createdFrom: "2026-09-21" });
    const garbage = buildStreamItem({
      created_at: "garbage",
      track: buildTrack({ created_at: "nope" }),
    });
    expect(matchesFilters(garbage, filters)).toBe(true);
    const missing = buildStreamItem({ track: buildTrack({ created_at: undefined }) });
    delete missing.created_at;
    expect(matchesFilters(missing, filters)).toBe(true);
  });

  it("ignores an unparseable source but still checks the other", () => {
    const filters = buildFilters({ createdFrom: "2026-09-21" });
    const item = buildStreamItem({
      created_at: "garbage",
      track: buildTrack({ created_at: localIso(2015, 1, 1) }),
    });
    expect(matchesFilters(item, filters)).toBe(false);
  });
});

describe("likes and plays", () => {
  const trackWith = (likes: number, plays: number) =>
    buildStreamItem({ track: buildTrack({ likes_count: likes, playback_count: plays }) });

  it("checks likes against an inclusive min/max", () => {
    const item = trackWith(10, 0);
    expect(matchesFilters(item, buildFilters({ minLikes: 10 }))).toBe(true);
    expect(matchesFilters(item, buildFilters({ minLikes: 11 }))).toBe(false);
    expect(matchesFilters(item, buildFilters({ maxLikes: 10 }))).toBe(true);
    expect(matchesFilters(item, buildFilters({ maxLikes: 9 }))).toBe(false);
    expect(matchesFilters(item, buildFilters({ minLikes: 5, maxLikes: 15 }))).toBe(true);
  });

  it("checks plays against an inclusive min/max", () => {
    const item = trackWith(0, 500);
    expect(matchesFilters(item, buildFilters({ minPlays: 500 }))).toBe(true);
    expect(matchesFilters(item, buildFilters({ minPlays: 501 }))).toBe(false);
    expect(matchesFilters(item, buildFilters({ maxPlays: 500 }))).toBe(true);
    expect(matchesFilters(item, buildFilters({ maxPlays: 499 }))).toBe(false);
  });

  it("passes tracks whose counts are missing", () => {
    const item = buildStreamItem({
      track: buildTrack({ likes_count: undefined, playback_count: undefined }),
    });
    expect(matchesFilters(item, buildFilters({ minLikes: 100, minPlays: 100 }))).toBe(true);
  });

  it("combines with search and duration", () => {
    const item = buildStreamItem({
      track: buildTrack({ title: "Garage Dub", likes_count: 20, duration: 200_000 }),
    });
    expect(
      matchesFilters(
        item,
        buildFilters({ searchString: "garage", minLikes: 10, maxDurationSeconds: 300 }),
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        item,
        buildFilters({ searchString: "garage", minLikes: 30, maxDurationSeconds: 300 }),
      ),
    ).toBe(false);
  });

  describe("playlists", () => {
    it("uses the playlist's own likes at playlist level", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          likes_count: 50,
          tracks: [buildTrack({ likes_count: 0 }), buildTrack({ likes_count: 0 })],
        }),
      });
      expect(matchesFilters(item, buildFilters({ minLikes: 40 }))).toBe(true);
      expect(matchesFilters(item, buildFilters({ minLikes: 60 }))).toBe(false);
    });

    it("passes when any track meets the likes filter even if the playlist does not", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          likes_count: 0,
          tracks: [buildTrack({ likes_count: 0 }), buildTrack({ likes_count: 80 })],
        }),
      });
      expect(matchesFilters(item, buildFilters({ minLikes: 60 }))).toBe(true);
    });

    it("plays filter is checked per track only (playlists have no play count)", () => {
      const noPlays = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          likes_count: 999,
          tracks: [buildTrack({ playback_count: 0 }), buildTrack({ playback_count: 0 })],
        }),
      });
      expect(matchesFilters(noPlays, buildFilters({ minPlays: 1 }))).toBe(false);

      const onePopular = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({
          tracks: [buildTrack({ playback_count: 0 }), buildTrack({ playback_count: 5 })],
        }),
      });
      expect(matchesFilters(onePopular, buildFilters({ minPlays: 1 }))).toBe(true);
    });

    it("a playlist without tracks is judged by its own likes", () => {
      const item = buildStreamItem({
        type: "playlist",
        playlist: buildPlaylist({ likes_count: 3, tracks: [] }),
      });
      expect(matchesFilters(item, buildFilters({ minLikes: 3 }))).toBe(true);
      expect(matchesFilters(item, buildFilters({ minLikes: 4 }))).toBe(false);
    });
  });
});

describe("trackToStreamItem", () => {
  it("wraps a bare track and promotes its upload date to the item date", () => {
    const track = buildTrack({ created_at: "2026-09-22T03:53:37Z" });
    const item = trackToStreamItem(track);
    expect(item.type).toBe("track");
    expect(item.track).toBe(track);
    expect(item.created_at).toBe("2026-09-22T03:53:37Z");
    expect(item.playlist).toBeUndefined();
    expect(item.user).toBeUndefined();
  });

  it("lets every filter apply to bare tracks", () => {
    const track = buildTrack({
      title: "Speed Garage Dub",
      created_at: localIso(2026, 9, 22),
      likes_count: 12,
      playback_count: 300,
      duration: 240_000,
      user: buildUser({ username: "CAPES" }),
    });
    const passing = buildFilters({
      searchMode: "extended",
      searchArtist: "capes",
      createdFrom: "2026-09-01",
      minLikes: 10,
      maxPlays: 1000,
      minDurationSeconds: 60,
    });
    expect(matchesFilters(trackToStreamItem(track), passing)).toBe(true);
    expect(
      matchesFilters(trackToStreamItem(track), { ...passing, createdFrom: "2026-09-23" }),
    ).toBe(false);
  });
});

describe("filterTrackResponse", () => {
  it("keeps only matching tracks", () => {
    const response = buildTrackCollectionResponse({
      collection: [
        buildTrack({ title: "Garage" }),
        buildTrack({ title: "Techno" }),
        buildTrack({ title: "House" }),
      ],
    });
    const result = filterTrackResponse(
      response,
      buildFilters({ searchString: "garage, house", searchOperator: "or" }),
    );
    expect(result.collection?.map((t) => t?.title)).toEqual(["Garage", "House"]);
  });

  it("preserves pagination fields and total_results", () => {
    const response = buildTrackCollectionResponse({
      next_href: "https://api-v2.soundcloud.com/recent-tracks/x?offset=cursor",
      query_urn: "soundcloud:search:abc",
      total_results: 23570,
    });
    const result = filterTrackResponse(response, buildFilters());
    expect(result.next_href).toBe(response.next_href);
    expect(result.query_urn).toBe(response.query_urn);
    expect(result.total_results).toBe(23570);
  });

  it("does not mutate the original response", () => {
    const response = buildTrackCollectionResponse({
      collection: [buildTrack({ title: "Keep" }), buildTrack({ title: "Remove" })],
    });
    filterTrackResponse(response, buildFilters({ searchString: "keep" }));
    expect(response.collection).toHaveLength(2);
  });

  it("tolerates a missing collection", () => {
    const result = filterTrackResponse({ next_href: null }, buildFilters());
    expect(result.collection).toBeUndefined();
  });
});

describe("hasClientSideFilters", () => {
  it("is false for defaults and for activity types alone", () => {
    expect(hasClientSideFilters(buildFilters())).toBe(false);
    expect(hasClientSideFilters(buildFilters({ activityTypes: ["TrackPost"] }))).toBe(false);
  });

  it("is true for each client-side filter", () => {
    expect(hasClientSideFilters(buildFilters({ searchString: "x" }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ minDurationSeconds: 1 }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ maxDurationSeconds: 1 }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ createdFrom: "2026-01-01" }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ createdTo: "2026-01-01" }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ minLikes: 0 }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ maxLikes: 0 }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ minPlays: 0 }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ maxPlays: 0 }))).toBe(true);
  });

  it("mirrors the search predicate's notion of an active search", () => {
    expect(hasClientSideFilters(buildFilters({ searchString: "x", searchFields: [] }))).toBe(false);
    expect(
      hasClientSideFilters(buildFilters({ searchMode: "extended", searchString: "ignored" })),
    ).toBe(false);
    expect(hasClientSideFilters(buildFilters({ searchMode: "extended", searchLabel: "x" }))).toBe(
      true,
    );
  });
});

describe("uploader followers", () => {
  // A plain track post: the poster is the uploader, so there is a single follower count.
  const byUploaderWith = (followers: number) => {
    const uploader = buildUser({ followers_count: followers });
    return buildStreamItem({ user: uploader, track: buildTrack({ user: uploader }) });
  };

  it("checks the track uploader's followers against an inclusive min/max", () => {
    const item = byUploaderWith(1000);
    expect(matchesFilters(item, buildFilters({ minFollowers: 1000 }))).toBe(true);
    expect(matchesFilters(item, buildFilters({ minFollowers: 1001 }))).toBe(false);
    expect(matchesFilters(item, buildFilters({ maxFollowers: 1000 }))).toBe(true);
    expect(matchesFilters(item, buildFilters({ maxFollowers: 999 }))).toBe(false);
  });

  it("passes when either the uploader or the reposter is in range", () => {
    const item = buildStreamItem({
      type: "track-repost",
      user: buildUser({ followers_count: 1_000_000 }),
      track: buildTrack({ user: buildUser({ followers_count: 5 }) }),
    });
    expect(matchesFilters(item, buildFilters({ minFollowers: 100 }))).toBe(true); // reposter
    expect(matchesFilters(item, buildFilters({ maxFollowers: 100 }))).toBe(true); // uploader
    // 5 fails the min and 1,000,000 fails the max: no single source is inside [100, 1000]
    expect(matchesFilters(item, buildFilters({ minFollowers: 100, maxFollowers: 1000 }))).toBe(
      false,
    );
  });

  it("passes when every source is missing, and skips missing sources otherwise", () => {
    const none = buildStreamItem({
      user: buildUser({ followers_count: undefined }),
      track: buildTrack({ user: buildUser({ followers_count: undefined }) }),
    });
    expect(matchesFilters(none, buildFilters({ minFollowers: 100 }))).toBe(true);

    const onlyUploader = buildStreamItem({
      user: buildUser({ followers_count: undefined }),
      track: buildTrack({ user: buildUser({ followers_count: 5 }) }),
    });
    expect(matchesFilters(onlyUploader, buildFilters({ minFollowers: 100 }))).toBe(false);
  });

  it("uses the owner or the poster at playlist level and each uploader per track", () => {
    const item = buildStreamItem({
      type: "playlist",
      user: buildUser({ followers_count: 20 }),
      playlist: buildPlaylist({
        user: buildUser({ followers_count: 50 }),
        tracks: [
          buildTrack({ user: buildUser({ followers_count: 1 }) }),
          buildTrack({ user: buildUser({ followers_count: 500 }) }),
        ],
      }),
    });
    expect(matchesFilters(item, buildFilters({ maxFollowers: 25 }))).toBe(true); // poster (20)
    expect(matchesFilters(item, buildFilters({ minFollowers: 40 }))).toBe(true); // owner (50)
    expect(matchesFilters(item, buildFilters({ minFollowers: 400 }))).toBe(true); // 2nd track
    expect(matchesFilters(item, buildFilters({ minFollowers: 600 }))).toBe(false);
  });

  it("applies to bare tag-page tracks", () => {
    const track = buildTrack({ user: buildUser({ followers_count: 7 }) });
    const result = filterTrackResponse(
      buildTrackCollectionResponse({ collection: [track] }),
      buildFilters({ maxFollowers: 10 }),
    );
    expect(result.collection).toHaveLength(1);
    expect(
      filterTrackResponse(
        buildTrackCollectionResponse({ collection: [track] }),
        buildFilters({ minFollowers: 10 }),
      ).collection,
    ).toHaveLength(0);
  });

  it("counts as a client-side filter", () => {
    expect(hasClientSideFilters(buildFilters({ minFollowers: 1 }))).toBe(true);
    expect(hasClientSideFilters(buildFilters({ maxFollowers: 1 }))).toBe(true);
  });
});
