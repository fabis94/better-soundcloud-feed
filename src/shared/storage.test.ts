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

import { filterStore } from "./storage";
import { buildFilters } from "../test/factories";
import { SCActivityType } from "./types";

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  filterStore.reload();
});

describe("filterStore", () => {
  it("returns defaults when storage is empty", () => {
    const filters = filterStore.get();
    expect(filters.activityTypes).toHaveLength(Object.keys(SCActivityType).length);
    expect(filters.searchString).toBe("");
    expect(filters.searchMode).toBe("simple");
    expect(filters.minDurationSeconds).toBeNull();
    expect(filters.maxDurationSeconds).toBeNull();
  });

  it("merges stored values with defaults", () => {
    localStorageMock.setItem("sc-feed-filters-sync", JSON.stringify({ searchString: "garage" }));
    filterStore.reload();
    const filters = filterStore.get();
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
    filterStore.reload();
    const filters = filterStore.get();
    expect(filters.activityTypes).toHaveLength(Object.keys(SCActivityType).length);
    expect(filters.searchString).toBe("");
    expect(filters.searchMode).toBe("simple");
  });

  it("round-trips update and get", () => {
    const filters = buildFilters({
      searchString: "garage",
      activityTypes: ["TrackPost"],
      minDurationSeconds: 60,
    });
    filterStore.update(filters);
    const loaded = filterStore.get();
    expect(loaded.searchString).toBe("garage");
    expect(loaded.activityTypes).toEqual(["TrackPost"]);
    expect(loaded.minDurationSeconds).toBe(60);
  });

  it("returns defaults when localStorage throws on read", () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    filterStore.reload();
    const filters = filterStore.get();
    expect(filters.activityTypes).toHaveLength(Object.keys(SCActivityType).length);
  });

  describe("isAvailable", () => {
    it("returns true when localStorage works", () => {
      expect(filterStore.isAvailable()).toBe(true);
    });

    it("returns false when localStorage throws", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("blocked");
      });
      expect(filterStore.isAvailable()).toBe(false);
    });
  });
});
