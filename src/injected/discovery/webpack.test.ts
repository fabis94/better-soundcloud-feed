// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";
import type { BridgeMessageTypeValue } from "../../shared/types/bridge";

vi.mock("../../shared/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

interface WebpackRequire {
  c: Record<string, { exports: Record<string, unknown> }>;
}

type WebpackChunk = [
  string[],
  Record<string, (m: unknown, e: unknown, require: WebpackRequire) => void>,
  string[][],
];

/**
 * Creates a mock webpackJsonp array whose .push behaves like webpack's runtime:
 * it immediately invokes the module factories listed in the chunk, passing a
 * fake `require` object with the provided module cache.
 */
function createWebpackJsonp(cache: Record<string, { exports: Record<string, unknown> }>) {
  const arr: unknown[] = [];
  arr.push = ((chunk: WebpackChunk) => {
    const [, factories, execList] = chunk;
    if (execList) {
      for (const entry of execList) {
        const name = entry[0]!;
        const factory = factories[name];
        if (factory) {
          factory({}, {}, { c: cache });
        }
      }
    }
    return arr.length;
  }) as typeof arr.push;
  return arr;
}

describe("webpack probe/discover", () => {
  let originalWebpackJsonp: unknown;

  beforeEach(() => {
    originalWebpackJsonp = (window as unknown as Record<string, unknown>).webpackJsonp;
  });

  afterEach(() => {
    if (originalWebpackJsonp === undefined) {
      delete (window as unknown as Record<string, unknown>).webpackJsonp;
    } else {
      (window as unknown as Record<string, unknown>).webpackJsonp = originalWebpackJsonp;
    }
    vi.restoreAllMocks();
  });

  describe("probe (via discover immediate resolution)", () => {
    it("returns null when webpackJsonp does not exist", async () => {
      delete (window as unknown as Record<string, unknown>).webpackJsonp;

      // discover will call probe, get null, then start polling.
      // We can't easily test probe directly since it's not exported,
      // so we re-import and test discover with immediate checks.
      const { discover } = await import("./webpack");
      vi.useFakeTimers();

      const predicate = vi.fn(() => true);
      const promise = discover({ predicate });

      // Should not resolve immediately (probe returned null)
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(resolved).toBe(false);

      vi.useRealTimers();
    });

    it("returns null when webpackJsonp.push is still Array.prototype.push", async () => {
      // Plain array — push is native, meaning webpack runtime hasn't loaded
      (window as unknown as Record<string, unknown>).webpackJsonp = [];

      const { discover } = await import("./webpack");
      vi.useFakeTimers();

      const predicate = vi.fn(() => true);
      const promise = discover({ predicate });

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(resolved).toBe(false);

      vi.useRealTimers();
    });

    it("returns null when no module matches the predicate", async () => {
      const cache = {
        mod1: { exports: { foo: "bar" } },
        mod2: { exports: { baz: 42 } },
      };
      (window as unknown as Record<string, unknown>).webpackJsonp = createWebpackJsonp(cache);

      const { discover } = await import("./webpack");
      vi.useFakeTimers();

      const predicate = vi.fn(() => false);
      const promise = discover({ predicate });

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(resolved).toBe(false);

      vi.useRealTimers();
    });

    it("returns matching module exports when found", async () => {
      const targetExports = { playCurrent: vi.fn(), seekTo: vi.fn() };
      const cache = {
        mod1: { exports: { unrelated: true } },
        mod2: { exports: targetExports },
      };
      (window as unknown as Record<string, unknown>).webpackJsonp = createWebpackJsonp(cache);

      const { discover } = await import("./webpack");

      const result = await discover<Record<string, unknown>>({
        predicate: (exports) => "playCurrent" in exports,
      });

      expect(result).toBe(targetExports);
    });

    it("uses unique chunk IDs per call", async () => {
      const pushCalls: WebpackChunk[] = [];
      const cache = { mod1: { exports: { target: true } } };
      const jsonp = createWebpackJsonp(cache);
      const originalPush = jsonp.push.bind(jsonp);
      jsonp.push = ((chunk: WebpackChunk) => {
        pushCalls.push(chunk);
        return originalPush(chunk);
      }) as typeof jsonp.push;
      (window as unknown as Record<string, unknown>).webpackJsonp = jsonp;

      const { discover } = await import("./webpack");

      await discover({ predicate: (e) => "target" in e });
      await discover({ predicate: (e) => "target" in e });

      const chunkId1 = pushCalls[0]![0]![0]!;
      const chunkId2 = pushCalls[1]![0]![0]!;
      expect(chunkId1).not.toBe(chunkId2);
      expect(chunkId1).toMatch(/^__scf_probe_\d+__$/);
      expect(chunkId2).toMatch(/^__scf_probe_\d+__$/);
    });
  });

  describe("discover", () => {
    it("resolves immediately if probe finds the module", async () => {
      const targetExports = { myModule: true };
      const cache = { mod1: { exports: targetExports } };
      (window as unknown as Record<string, unknown>).webpackJsonp = createWebpackJsonp(cache);

      const { discover } = await import("./webpack");

      const result = await discover<Record<string, unknown>>({
        predicate: (exports) => "myModule" in exports,
      });

      expect(result).toBe(targetExports);
    });

    it("polls and resolves when module becomes available", async () => {
      // Start with no webpack runtime
      (window as unknown as Record<string, unknown>).webpackJsonp = [];

      const { discover } = await import("./webpack");
      vi.useFakeTimers();

      const targetExports = { lateModule: true };
      const predicate = (exports: Record<string, unknown>) => "lateModule" in exports;
      const promise = discover<Record<string, unknown>>({ predicate });

      let resolved = false;
      let resolvedValue: Record<string, unknown> | undefined;
      promise.then((v) => {
        resolved = true;
        resolvedValue = v;
      });

      // After first poll — still no runtime
      await vi.advanceTimersByTimeAsync(1000);
      expect(resolved).toBe(false);

      // Now install the webpack runtime with the module
      const cache = { mod1: { exports: targetExports } };
      (window as unknown as Record<string, unknown>).webpackJsonp = createWebpackJsonp(cache);

      // Next poll should find it
      await vi.advanceTimersByTimeAsync(1000);
      expect(resolved).toBe(true);
      expect(resolvedValue).toBe(targetExports);

      vi.useRealTimers();
    });

    it("sets dataset attribute when datasetKey is provided", async () => {
      const cache = { mod1: { exports: { found: true } } };
      (window as unknown as Record<string, unknown>).webpackJsonp = createWebpackJsonp(cache);

      const { discover } = await import("./webpack");

      await discover({
        predicate: (exports) => "found" in exports,
        datasetKey: "scfTestReady",
      });

      expect(document.documentElement.dataset.scfTestReady).toBe("true");

      // Clean up
      delete document.documentElement.dataset.scfTestReady;
    });

    it("posts message when messageType is provided", async () => {
      const cache = { mod1: { exports: { found: true } } };
      (window as unknown as Record<string, unknown>).webpackJsonp = createWebpackJsonp(cache);

      const postMessageSpy = vi.spyOn(window, "postMessage");

      const { discover } = await import("./webpack");

      const messageType = "SC_PLAYER_READY" as BridgeMessageTypeValue;
      await discover({
        predicate: (exports) => "found" in exports,
        messageType,
      });

      expect(postMessageSpy).toHaveBeenCalledWith({ type: messageType }, "*");
    });

    it("does not set dataset or post message when options are omitted", async () => {
      const cache = { mod1: { exports: { found: true } } };
      (window as unknown as Record<string, unknown>).webpackJsonp = createWebpackJsonp(cache);

      const postMessageSpy = vi.spyOn(window, "postMessage");
      const keysBefore = Object.keys(document.documentElement.dataset);

      const { discover } = await import("./webpack");

      await discover({
        predicate: (exports) => "found" in exports,
      });

      expect(postMessageSpy).not.toHaveBeenCalled();
      // No new dataset keys should have been added
      expect(Object.keys(document.documentElement.dataset)).toEqual(keysBefore);
    });
  });
});
