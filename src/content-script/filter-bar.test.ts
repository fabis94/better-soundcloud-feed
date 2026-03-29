// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "@voidzero-dev/vite-plus-test";
import { formatActivityType, isFeedPage } from "./filter-bar";

// --- formatActivityType ---

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

// --- isFeedPage ---

describe("isFeedPage", () => {
  function setPathname(path: string) {
    Object.defineProperty(window, "location", {
      value: { ...window.location, pathname: path },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    setPathname("/");
  });

  it("returns true for /", () => {
    setPathname("/");
    expect(isFeedPage()).toBe(true);
  });

  it("returns true for /feed", () => {
    setPathname("/feed");
    expect(isFeedPage()).toBe(true);
  });

  it("returns true for /discover/feed", () => {
    setPathname("/discover/feed");
    expect(isFeedPage()).toBe(true);
  });

  it("returns false for /you/likes", () => {
    setPathname("/you/likes");
    expect(isFeedPage()).toBe(false);
  });
});
