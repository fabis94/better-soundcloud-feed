import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
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
import { buildStreamItem, buildTrack, buildUser } from "../../test/factories";

describe("parseSearchString", () => {
  it("returns empty arrays for empty string", () => {
    const parsed = parseSearchString("");
    expect(parsed.includes).toHaveLength(0);
    expect(parsed.excludes).toHaveLength(0);
  });

  it("parses single include term", () => {
    const parsed = parseSearchString("garage");
    expect(parsed.includes).toHaveLength(1);
    expect(parsed.excludes).toHaveLength(0);
  });

  it("parses multiple comma-separated includes", () => {
    const parsed = parseSearchString("garage, house, techno");
    expect(parsed.includes).toHaveLength(3);
  });

  it("parses exclude terms with - prefix", () => {
    const parsed = parseSearchString("-spammer, -boring");
    expect(parsed.excludes).toHaveLength(2);
    expect(parsed.includes).toHaveLength(0);
  });

  it("parses mixed include and exclude terms", () => {
    const parsed = parseSearchString("garage, -spammer, house");
    expect(parsed.includes).toHaveLength(2);
    expect(parsed.excludes).toHaveLength(1);
  });

  it("converts * wildcard to regex .*", () => {
    const parsed = parseSearchString("epic*house");
    expect(parsed.includes[0]!.test("epic house")).toBe(true);
    expect(parsed.includes[0]!.test("epichouse")).toBe(true);
    expect(parsed.includes[0]!.test("epic deep house")).toBe(true);
    expect(parsed.includes[0]!.test("house epic")).toBe(false);
  });

  it("trims whitespace from terms", () => {
    const parsed = parseSearchString("  garage ,  house  ");
    expect(parsed.includes).toHaveLength(2);
    expect(parsed.includes[0]!.test("garage")).toBe(true);
  });

  it("ignores empty terms from extra commas", () => {
    const parsed = parseSearchString(",garage,,house,");
    expect(parsed.includes).toHaveLength(2);
  });

  it("treats lone - as include, not exclude", () => {
    const parsed = parseSearchString("-");
    expect(parsed.includes).toHaveLength(1);
    expect(parsed.excludes).toHaveLength(0);
  });

  it("escapes regex special characters", () => {
    const parsed = parseSearchString("foo.bar");
    expect(parsed.includes[0]!.test("foo.bar")).toBe(true);
    expect(parsed.includes[0]!.test("fooXbar")).toBe(false);
  });
});

describe("matchesSearch", () => {
  it("returns true for empty parsed search", () => {
    expect(matchesSearch("anything", { includes: [], excludes: [] })).toBe(true);
  });

  it("OR mode: passes if any include matches", () => {
    const parsed = parseSearchString("garage, house");
    expect(matchesSearch("UK Garage Mix", parsed, "or")).toBe(true);
    expect(matchesSearch("Deep House", parsed, "or")).toBe(true);
    expect(matchesSearch("Techno", parsed, "or")).toBe(false);
  });

  it("AND mode: passes only if all includes match", () => {
    const parsed = parseSearchString("garage, uk");
    expect(matchesSearch("UK Garage Mix", parsed, "and")).toBe(true);
    expect(matchesSearch("Speed Garage", parsed, "and")).toBe(false);
  });

  it("excludes reject regardless of operator", () => {
    const parsed = parseSearchString("garage, -spammer");
    expect(matchesSearch("garage by spammer", parsed, "or")).toBe(false);
    expect(matchesSearch("garage by dj", parsed, "or")).toBe(true);
  });

  it("excludes-only: passes items not matching any exclude", () => {
    const parsed = parseSearchString("-spammer, -boring");
    expect(matchesSearch("great track", parsed)).toBe(true);
    expect(matchesSearch("boring track", parsed)).toBe(false);
    expect(matchesSearch("spammer dj", parsed)).toBe(false);
  });

  it("is case-insensitive", () => {
    const parsed = parseSearchString("GARAGE");
    expect(matchesSearch("uk garage", parsed)).toBe(true);
  });

  it("wildcard matching works", () => {
    const parsed = parseSearchString("epic*house");
    expect(matchesSearch("Epic Deep House", parsed)).toBe(true);
    expect(matchesSearch("Epichouse", parsed)).toBe(true);
    expect(matchesSearch("House Epic", parsed)).toBe(false);
  });

  it("defaults to OR operator", () => {
    const parsed = parseSearchString("garage, house");
    expect(matchesSearch("garage only", parsed)).toBe(true);
  });
});

describe("field extractors", () => {
  it("getAllSearchableText joins all fields", () => {
    const item = buildStreamItem({
      type: "track",
      user: buildUser({ username: "reposter" }),
      track: buildTrack({
        title: "My Track",
        description: "A great track",
        genre: "House",
        label_name: "Cool Label",
        publisher_metadata: {
          id: 1,
          urn: "x",
          artist: "DJ Cool",
          contains_music: true,
          isrc: "x",
          explicit: false,
        },
        user: buildUser({ username: "original-artist" }),
      }),
    });
    const text = getAllSearchableText(item);
    expect(text).toContain("My Track");
    expect(text).toContain("A great track");
    expect(text).toContain("House");
    expect(text).toContain("original-artist");
    expect(text).toContain("reposter");
    expect(text).toContain("Cool Label");
    expect(text).toContain("DJ Cool");
  });

  it("getTitleText returns track title", () => {
    const item = buildStreamItem({ track: buildTrack({ title: "Test Title" }) });
    expect(getTitleText(item)).toBe("Test Title");
  });

  it("getDescriptionText returns track description", () => {
    const item = buildStreamItem({ track: buildTrack({ description: "Test Desc" }) });
    expect(getDescriptionText(item)).toBe("Test Desc");
  });

  it("getGenreText returns genre", () => {
    const item = buildStreamItem({ track: buildTrack({ genre: "Dubstep" }) });
    expect(getGenreText(item)).toBe("Dubstep");
  });

  it("getArtistText returns both usernames", () => {
    const item = buildStreamItem({
      user: buildUser({ username: "reposter" }),
      track: buildTrack({ user: buildUser({ username: "artist" }) }),
    });
    const text = getArtistText(item);
    expect(text).toContain("artist");
    expect(text).toContain("reposter");
  });

  it("getLabelText returns label and publisher", () => {
    const item = buildStreamItem({
      track: buildTrack({
        label_name: "My Label",
        publisher_metadata: {
          id: 1,
          urn: "x",
          artist: "Publisher Artist",
          contains_music: true,
          isrc: "x",
          explicit: false,
        },
      }),
    });
    const text = getLabelText(item);
    expect(text).toContain("My Label");
    expect(text).toContain("Publisher Artist");
  });

  it("handles missing fields gracefully", () => {
    const item = {};
    expect(getAllSearchableText(item)).toBe("\n\n\n\n\n\n");
    expect(getTitleText(item)).toBe("");
    expect(getDescriptionText(item)).toBe("");
    expect(getGenreText(item)).toBe("");
    expect(getArtistText(item)).toBe("\n");
    expect(getLabelText(item)).toBe("\n");
  });
});
