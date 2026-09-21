// @vitest-environment jsdom
import { describe, it, expect, vi } from "@voidzero-dev/vite-plus-test";
import { BridgeMessageType } from "../shared/types";

// Simulates a browser that ignored `world: "MAIN"` and ran injected.js as an
// ordinary isolated-world content script: the extension runtime is present.

vi.mock("../shared/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("./discovery/player", () => ({
  discoverPlayer: () => new Promise(() => {}),
}));

vi.mock("./discovery/social", () => ({
  discoverSocialActions: () => new Promise(() => {}),
}));

Object.defineProperty(globalThis, "chrome", {
  value: {
    runtime: {
      id: "abcdefghijklmnop",
      getURL: (path: string) => `chrome-extension://abcdefghijklmnop/${path}`,
    },
  },
  configurable: true,
});

const postMessageCalls: unknown[][] = [];
window.postMessage = function (...args: unknown[]) {
  postMessageCalls.push(args);
};

const originalFetch = window.fetch;
const originalXHROpen = XMLHttpRequest.prototype.open;

await import("./index");

describe("injected module in an isolated world", () => {
  it("loads itself into the page via a <script> tag", () => {
    const script = document.querySelector<HTMLScriptElement>(
      'script[src="chrome-extension://abcdefghijklmnop/injected.js"]',
    );
    expect(script).not.toBeNull();
  });

  it("does not patch fetch or XHR in the isolated world", () => {
    expect(window.fetch).toBe(originalFetch);
    expect(XMLHttpRequest.prototype.open).toBe(originalXHROpen);
  });

  it("does not signal readiness from the isolated world", () => {
    const readyCall = postMessageCalls.find(
      (args) => (args[0] as Record<string, unknown>)?.type === BridgeMessageType.FilterReady,
    );
    expect(readyCall).toBeUndefined();
  });
});
