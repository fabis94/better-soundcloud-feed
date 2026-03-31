// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";
import { BridgeMessageType } from "../types";

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

import { ReactiveStore } from "./reactive-store";

interface TestState {
  name: string;
  count: number;
  active: boolean;
}

const DEFAULTS: TestState = { name: "", count: 0, active: false };

let testStore: ReactiveStore<TestState>;

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  testStore = new ReactiveStore<TestState>("test-store", DEFAULTS);
});

describe("ReactiveStore", () => {
  describe("get", () => {
    it("returns defaults when storage is empty", () => {
      expect(testStore.get()).toEqual(DEFAULTS);
    });

    it("returns a shallow copy, not the internal reference", () => {
      const a = testStore.get();
      const b = testStore.get();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it("returns a single key when called with a key argument", () => {
      expect(testStore.get("name")).toBe("");
      expect(testStore.get("count")).toBe(0);
      expect(testStore.get("active")).toBe(false);
    });

    it("merges stored values with defaults on first access", () => {
      localStorageMock.setItem("test-store-2", JSON.stringify({ name: "hello" }));
      const store2 = new ReactiveStore<TestState>("test-store-2", DEFAULTS);
      expect(store2.get("name")).toBe("hello");
      expect(store2.get("count")).toBe(0); // default preserved
    });
  });

  describe("update", () => {
    it("merges partial state", () => {
      testStore.update({ name: "updated" });
      expect(testStore.get("name")).toBe("updated");
      expect(testStore.get("count")).toBe(0); // untouched
    });

    it("persists to localStorage", () => {
      testStore.update({ count: 42 });
      const stored = JSON.parse(localStorageMock.getItem("test-store")!);
      expect(stored.count).toBe(42);
    });

    it("notifies subscribers", () => {
      const listener = vi.fn();
      testStore.subscribe(listener);
      testStore.update({ active: true });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    });

    it("notifies multiple subscribers", () => {
      const a = vi.fn();
      const b = vi.fn();
      testStore.subscribe(a);
      testStore.subscribe(b);
      testStore.update({ name: "x" });
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscribe", () => {
    it("returns an unsubscribe function", () => {
      const listener = vi.fn();
      const unsub = testStore.subscribe(listener);
      testStore.update({ count: 1 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      testStore.update({ count: 2 });
      expect(listener).toHaveBeenCalledTimes(1); // no new call
    });
  });

  describe("reload", () => {
    it("re-reads state from localStorage", () => {
      testStore.update({ name: "old" });
      localStorageMock.setItem("test-store", JSON.stringify({ ...DEFAULTS, name: "new" }));
      testStore.reload();
      expect(testStore.get("name")).toBe("new");
    });
  });

  describe("isAvailable", () => {
    it("returns true when localStorage works", () => {
      expect(testStore.isAvailable()).toBe(true);
    });

    it("returns false when localStorage throws", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("blocked");
      });
      expect(testStore.isAvailable()).toBe(false);
    });
  });

  describe("cross-realm sync", () => {
    it("posts SC_STORE_SYNC message on update", () => {
      const spy = vi.spyOn(window, "postMessage");
      testStore.update({ name: "synced" });
      expect(spy).toHaveBeenCalledWith(
        { type: BridgeMessageType.StoreSync, key: "test-store" },
        "*",
      );
      spy.mockRestore();
    });

    it("reloads and notifies on incoming sync message for matching key", () => {
      const listener = vi.fn();
      testStore.subscribe(listener);

      // Simulate another realm updating localStorage directly
      localStorageMock.setItem(
        "test-store",
        JSON.stringify({ ...DEFAULTS, name: "from-other-realm" }),
      );

      // Dispatch sync message as if from the other realm
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: BridgeMessageType.StoreSync, key: "test-store" },
          source: window,
        }),
      );

      expect(testStore.get("name")).toBe("from-other-realm");
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ name: "from-other-realm" }));
    });

    it("ignores sync messages for different store keys", () => {
      const listener = vi.fn();
      testStore.subscribe(listener);

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: BridgeMessageType.StoreSync, key: "other-store" },
          source: window,
        }),
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it("ignores non-sync messages", () => {
      const listener = vi.fn();
      testStore.subscribe(listener);

      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: BridgeMessageType.PlayerReady },
          source: window,
        }),
      );

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns defaults when localStorage.getItem throws", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("blocked");
      });
      const s = new ReactiveStore<TestState>("err-store", DEFAULTS);
      expect(s.get()).toEqual(DEFAULTS);
    });

    it("handles localStorage.setItem errors gracefully", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("quota exceeded");
      });
      // Should not throw
      expect(() => testStore.update({ count: 999 })).not.toThrow();
      // State still updated in memory
      expect(testStore.get("count")).toBe(999);
    });
  });
});
