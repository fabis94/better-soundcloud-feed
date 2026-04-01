// @vitest-environment jsdom
import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { formatTime, getArtworkUrl, formatRelativeTime } from "./format";

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

describe("formatRelativeTime", () => {
  function ago(ms: number): string {
    return new Date(Date.now() - ms).toISOString();
  }

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it('returns "just now" for dates in the future', () => {
    expect(formatRelativeTime(new Date(Date.now() + 60000).toISOString())).toBe("just now");
  });

  it('returns "just now" for less than a minute ago', () => {
    expect(formatRelativeTime(ago(30 * SECOND))).toBe("just now");
  });

  it("formats minutes", () => {
    expect(formatRelativeTime(ago(5 * MINUTE))).toBe("5m ago");
    expect(formatRelativeTime(ago(59 * MINUTE))).toBe("59m ago");
  });

  it("formats hours", () => {
    expect(formatRelativeTime(ago(1 * HOUR))).toBe("1h ago");
    expect(formatRelativeTime(ago(23 * HOUR))).toBe("23h ago");
  });

  it("formats days", () => {
    expect(formatRelativeTime(ago(1 * DAY))).toBe("1d ago");
    expect(formatRelativeTime(ago(13 * DAY))).toBe("13d ago");
  });

  it("formats weeks", () => {
    expect(formatRelativeTime(ago(14 * DAY))).toBe("2w ago");
    expect(formatRelativeTime(ago(55 * DAY))).toBe("7w ago");
  });

  it("formats months", () => {
    expect(formatRelativeTime(ago(60 * DAY))).toBe("2mo ago");
    expect(formatRelativeTime(ago(300 * DAY))).toBe("10mo ago");
  });

  it("formats years", () => {
    expect(formatRelativeTime(ago(365 * DAY))).toBe("1y ago");
    expect(formatRelativeTime(ago(730 * DAY))).toBe("2y ago");
  });
});
