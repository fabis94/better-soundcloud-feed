// @vitest-environment jsdom
import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { formatTime, getArtworkUrl } from "./format";

describe("formatTime", () => {
  it("formats 0ms as 0:00", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats 5000ms as 0:05", () => {
    expect(formatTime(5000)).toBe("0:05");
  });

  it("formats 65000ms as 1:05", () => {
    expect(formatTime(65000)).toBe("1:05");
  });

  it("formats 125000ms as 2:05", () => {
    expect(formatTime(125000)).toBe("2:05");
  });

  it("formats negative values using Math.floor behavior", () => {
    expect(formatTime(-60000)).toBe("-1:00");
  });
});

describe("getArtworkUrl", () => {
  it("returns empty string for null", () => {
    expect(getArtworkUrl(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(getArtworkUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(getArtworkUrl("")).toBe("");
  });

  it("replaces -large with -t300x300 in URL", () => {
    expect(getArtworkUrl("https://i1.sndcdn.com/artworks-abc-large.jpg")).toBe(
      "https://i1.sndcdn.com/artworks-abc-t300x300.jpg",
    );
  });

  it("returns URL unchanged when -large is not present", () => {
    const url = "https://i1.sndcdn.com/artworks-abc-t500x500.jpg";
    expect(getArtworkUrl(url)).toBe(url);
  });
});
