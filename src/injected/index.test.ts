// @vitest-environment jsdom
import { describe, it, expect, vi } from "@voidzero-dev/vite-plus-test";
import { BridgeMessageType } from "../shared/types";

// Mock logger
vi.mock("../shared/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock storage
vi.mock("../shared/stores/filter-store", () => ({
  filterStore: {
    get: () => ({
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

// Mock settings store
vi.mock("../shared/stores/settings-store", () => ({
  settingsStore: {
    get: (key?: string) => {
      if (key === "seekSeconds") return 30;
      return { seekEnabled: false, seekSeconds: 30 };
    },
    update: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    reload: vi.fn(),
    isAvailable: () => true,
  },
}));

// Mock player discovery (never resolves to avoid side effects)
vi.mock("./discovery/player", () => ({
  discoverPlayer: () => new Promise(() => {}),
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
      (args) => (args[0] as Record<string, unknown>)?.type === BridgeMessageType.FilterReady,
    );
    expect(readyCall).toBeDefined();
    expect(readyCall![1]).toBe("*");
  });

  it("accepts SC_PLAYER_COMMAND messages without error", () => {
    expect(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: BridgeMessageType.PlayerCommand,
            payload: { action: "seekForward" },
          },
          source: window,
        }),
      );
    }).not.toThrow();
  });
});
