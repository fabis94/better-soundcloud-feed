import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { formatActivityType } from "./filter-bar";

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
