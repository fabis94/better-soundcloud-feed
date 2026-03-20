import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { matchesFilters, filterStreamResponse } from "./filters";
import {
  buildStreamItem,
  buildTrack,
  buildUser,
  buildFilters,
  buildStreamResponse,
} from "../test/factories";

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
          publisher_metadata: { id: 1, urn: "x", artist: "Famous Artist", contains_music: true, isrc: "x", explicit: false },
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
      expect(matchesFilters(item, buildFilters({ searchString: "uk, garage", searchOperator: "and" }))).toBe(true);
      expect(matchesFilters(item, buildFilters({ searchString: "uk, techno", searchOperator: "and" }))).toBe(false);
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

  describe("extended search", () => {
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
      expect(matchesFilters(item, buildFilters({ minDurationSeconds: 60, maxDurationSeconds: 300 }))).toBe(true);
    });

    it("null min/max means no constraint", () => {
      const item = buildStreamItem({ track: buildTrack({ duration: 1000 }) });
      expect(matchesFilters(item, buildFilters({ minDurationSeconds: null, maxDurationSeconds: null }))).toBe(true);
    });

    it("playlists are not filtered by duration", () => {
      const item = buildStreamItem({ type: "playlist" });
      expect(matchesFilters(item, buildFilters({ minDurationSeconds: 9999 }))).toBe(true);
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
