// @vitest-environment jsdom
import { describe, it, expect, vi } from "@voidzero-dev/vite-plus-test";

// Mock logger
vi.mock("../shared/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock storage
vi.mock("../shared/storage", () => ({
  filterStorage: {
    load: () => ({
      activityTypes: ["TrackPost", "TrackRepost", "PlaylistPost"],
      searchMode: "simple",
      searchString: "",
      searchTitle: "",
      searchDescription: "",
      searchGenre: "",
      searchArtist: "",
      searchLabel: "",
      searchOperator: "and",
      minDurationSeconds: null,
      maxDurationSeconds: null,
    }),
  },
}));

// Capture postMessage calls BEFORE the IIFE runs
const postMessageCalls: unknown[][] = [];
const origPostMessage = window.postMessage.bind(window);
window.postMessage = function (...args: unknown[]) {
  postMessageCalls.push(args);
  return origPostMessage(...(args as Parameters<typeof origPostMessage>));
};

// Save originals before the module patches them
const originalFetch = window.fetch;
const originalXHROpen = XMLHttpRequest.prototype.open;

// Import the module — triggers the IIFE
await import("./index");

describe("injected module", () => {
  it("patches window.fetch", () => {
    expect(window.fetch).not.toBe(originalFetch);
  });

  it("patches XMLHttpRequest.prototype.open", () => {
    expect(XMLHttpRequest.prototype.open).not.toBe(originalXHROpen);
  });

  it("posts SC_FILTER_READY message on init", () => {
    const readyCall = postMessageCalls.find(
      (args) => (args[0] as Record<string, unknown>)?.type === "SC_FILTER_READY",
    );
    expect(readyCall).toBeDefined();
    expect(readyCall![1]).toBe("*");
  });

  it("accepts SC_FILTER_UPDATE messages without error", () => {
    expect(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "SC_FILTER_UPDATE",
            filters: {
              activityTypes: ["TrackPost"],
              searchMode: "simple",
              searchString: "test",
              searchTitle: "",
              searchDescription: "",
              searchGenre: "",
              searchArtist: "",
              searchLabel: "",
              searchOperator: "and",
              minDurationSeconds: null,
              maxDurationSeconds: null,
            },
          },
          source: window,
        }),
      );
    }).not.toThrow();
  });
});
