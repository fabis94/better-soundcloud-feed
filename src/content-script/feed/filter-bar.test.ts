import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { formatActivityType, formatSearchField } from "./filter-bar";
import { SearchField } from "../../shared/types";

describe("formatActivityType", () => {
  it("converts TrackPost to Track post", () => {
    expect(formatActivityType("TrackPost")).toBe("Track post");
  });

  it("converts TrackRepost to Track repost", () => {
    expect(formatActivityType("TrackRepost")).toBe("Track repost");
  });

  it("converts PlaylistPost to Playlist post", () => {
    expect(formatActivityType("PlaylistPost")).toBe("Playlist post");
  });
});

describe("formatSearchField", () => {
  it("capitalises the field value", () => {
    expect(formatSearchField("title")).toBe("Title");
    expect(formatSearchField("description")).toBe("Description");
  });

  it("produces a distinct label for every SearchField", () => {
    const labels = Object.values(SearchField).map(formatSearchField);
    expect(labels).toEqual(["Title", "Description", "Genre", "Artist", "Label"]);
  });
});
