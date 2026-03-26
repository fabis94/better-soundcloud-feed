import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";

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

import { filterStorage } from "./storage";
import { buildFilters } from "../test/factories";
import { SCActivityType } from "./types";

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe("filterStorage", () => {
  it("returns defaults when storage is empty", () => {
    const filters = filterStorage.load();
    expect(filters.activityTypes).toHaveLength(Object.keys(SCActivityType).length);
    expect(filters.searchString).toBe("");
    expect(filters.searchMode).toBe("simple");
    expect(filters.minDurationSeconds).toBeNull();
    expect(filters.maxDurationSeconds).toBeNull();
  });

  it("merges stored values with defaults", () => {
    localStorageMock.setItem("sc-feed-filters-sync", JSON.stringify({ searchString: "garage" }));
    const filters = filterStorage.load();
    expect(filters.searchString).toBe("garage");
    expect(filters.activityTypes).toHaveLength(Object.keys(SCActivityType).length);
  });

  it("handles old-format stored data gracefully", () => {
    localStorageMock.setItem(
      "sc-feed-filters-sync",
      JSON.stringify({
        types: ["track", "track-repost"],
        excludeArtists: ["spammer"],
        genres: ["house"],
      }),
    );
    const filters = filterStorage.load();
    expect(filters.activityTypes).toHaveLength(Object.keys(SCActivityType).length);
    expect(filters.searchString).toBe("");
    expect(filters.searchMode).toBe("simple");
  });

  it("round-trips save and load", () => {
    const filters = buildFilters({
      searchString: "garage",
      activityTypes: ["TrackPost"],
      minDurationSeconds: 60,
    });
    filterStorage.save(filters);
    const loaded = filterStorage.load();
    expect(loaded.searchString).toBe("garage");
    expect(loaded.activityTypes).toEqual(["TrackPost"]);
    expect(loaded.minDurationSeconds).toBe(60);
  });

  it("returns defaults when localStorage throws on read", () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    const filters = filterStorage.load();
    expect(filters.activityTypes).toHaveLength(Object.keys(SCActivityType).length);
  });

  describe("isAvailable", () => {
    it("returns true when localStorage works", () => {
      expect(filterStorage.isAvailable()).toBe(true);
    });

    it("returns false when localStorage throws", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("blocked");
      });
      expect(filterStorage.isAvailable()).toBe(false);
    });
  });
});
