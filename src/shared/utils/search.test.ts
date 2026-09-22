import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import {
  parseSearchString,
  matchesSearch,
  getSearchableText,
  getTitleText,
  getDescriptionText,
  getGenreText,
  getArtistText,
  getLabelText,
} from "./search";
import { buildStreamItem, buildTrack, buildPlaylist, buildUser } from "../../test/factories";
import { SearchField } from "../types";

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
  it("getSearchableText joins all fields by default", () => {
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
    const text = getSearchableText(item);
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

  it("getArtistText returns uploader, reposter and release artist", () => {
    const item = buildStreamItem({
      user: buildUser({ username: "reposter" }),
      track: buildTrack({
        user: buildUser({ username: "Livity Sound" }),
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
    const text = getArtistText(item);
    expect(text).toContain("Livity Sound");
    expect(text).toContain("reposter");
    expect(text).toContain("Peverelist");
  });

  it("getLabelText returns the label name but not the release artist", () => {
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
    expect(text).toBe("My Label");
    expect(text).not.toContain("Publisher Artist");
  });

  it("handles missing fields gracefully", () => {
    const item = {};
    expect(getSearchableText(item)).toBe("\n\n\n\n\n\n");
    expect(getTitleText(item)).toBe("");
    expect(getDescriptionText(item)).toBe("");
    expect(getGenreText(item)).toBe("");
    expect(getArtistText(item)).toBe("\n\n");
    expect(getLabelText(item)).toBe("");
  });
});

describe("getSearchableText with selected fields", () => {
  const item = buildStreamItem({
    type: "track",
    user: buildUser({ username: "reposter" }),
    track: buildTrack({
      title: "Wreck III",
      description: "a brooding house-tempo cut",
      genre: "Techno",
      label_name: "Livity Sound Recordings",
      publisher_metadata: {
        id: 1,
        urn: "x",
        artist: "Peverelist",
        contains_music: true,
        isrc: "x",
        explicit: false,
      },
      user: buildUser({ username: "Livity Sound" }),
    }),
  });

  it("only includes text from the selected fields", () => {
    const text = getSearchableText(item, [SearchField.Title, SearchField.Genre]);
    expect(text).toBe("Wreck III\nTechno");
  });

  it("leaves out the description when it is deselected", () => {
    const fields = Object.values(SearchField).filter((f) => f !== SearchField.Description);
    expect(getSearchableText(item, fields)).not.toContain("house-tempo");
    expect(getSearchableText(item)).toContain("house-tempo");
  });

  it("puts the release artist under artist, not label", () => {
    expect(getSearchableText(item, [SearchField.Artist])).toBe(
      "Livity Sound\nreposter\nPeverelist",
    );
    expect(getSearchableText(item, [SearchField.Label])).toBe("Livity Sound Recordings");
  });

  it("emits fields in canonical order regardless of selection order", () => {
    expect(getSearchableText(item, [SearchField.Genre, SearchField.Title])).toBe(
      "Wreck III\nTechno",
    );
  });

  it("returns an empty string when no fields are selected", () => {
    expect(getSearchableText(item, [])).toBe("");
  });

  it("ignores unknown field values from stale persisted state", () => {
    const fields = ["bogus", SearchField.Title] as unknown as SearchField[];
    expect(getSearchableText(item, fields)).toBe("Wreck III");
  });

  it("reads description and label from playlists too", () => {
    const playlistItem = buildStreamItem({
      type: "playlist",
      track: undefined,
      playlist: {
        ...buildPlaylist({ title: "Steppin On Toes EP" }),
        description: "four rollers",
        label_name: "1985 Music",
      } as ReturnType<typeof buildPlaylist>,
    });
    expect(getSearchableText(playlistItem, [SearchField.Description])).toBe("four rollers");
    expect(getSearchableText(playlistItem, [SearchField.Label])).toBe("1985 Music");
  });
});

describe("extended-mode extractors on playlists", () => {
  const playlistItem = buildStreamItem({
    type: "playlist",
    playlist: {
      ...buildPlaylist({ title: "Compilation" }),
      description: "Label showcase",
      label_name: "Livity Sound",
    } as ReturnType<typeof buildPlaylist>,
  });

  it("getDescriptionText reads the playlist description", () => {
    expect(getDescriptionText(playlistItem)).toBe("Label showcase");
  });

  it("getLabelText reads the playlist label", () => {
    expect(getLabelText(playlistItem)).toBe("Livity Sound");
  });
});
