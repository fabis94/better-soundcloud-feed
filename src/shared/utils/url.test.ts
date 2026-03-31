import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { isStreamUrl, extractUrl, withActivityTypes } from "./url";

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

describe("extractUrl", () => {
  it("returns string input as-is", () => {
    expect(extractUrl("https://example.com")).toBe("https://example.com");
  });

  it("converts URL object to string", () => {
    const url = new URL("https://example.com/path");
    expect(extractUrl(url)).toBe("https://example.com/path");
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
