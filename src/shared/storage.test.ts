import { describe, it, expect, vi } from "@voidzero-dev/vite-plus-test";
import { createFilterStorage } from "./storage";
import type { StorageBackend } from "./storage";
import { buildFilters } from "../test/factories";

function mockBackend(initial: Record<string, unknown> = {}): StorageBackend {
  const store = { ...initial };
  return {
    get: vi.fn(async (keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const k of keyList) {
        if (k in store) result[k] = store[k];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    }),
  };
}

describe("createFilterStorage", () => {
  it("returns defaults when storage is empty", async () => {
    const storage = createFilterStorage(mockBackend());
    const filters = await storage.load();
    expect(filters.activityTypes).toHaveLength(3);
    expect(filters.searchString).toBe("");
    expect(filters.searchMode).toBe("simple");
    expect(filters.minDurationSeconds).toBeNull();
    expect(filters.maxDurationSeconds).toBeNull();
  });

  it("merges stored values with defaults", async () => {
    const backend = mockBackend({
      "sc-feed-filters": { searchString: "garage" },
    });
    const storage = createFilterStorage(backend);
    const filters = await storage.load();
    expect(filters.searchString).toBe("garage");
    expect(filters.activityTypes).toHaveLength(3); // defaults preserved
  });

  it("handles old-format stored data gracefully", async () => {
    const backend = mockBackend({
      "sc-feed-filters": {
        types: ["track", "track-repost"],
        excludeArtists: ["spammer"],
        genres: ["house"],
      },
    });
    const storage = createFilterStorage(backend);
    const filters = await storage.load();
    // New fields get defaults
    expect(filters.activityTypes).toHaveLength(3);
    expect(filters.searchString).toBe("");
    expect(filters.searchMode).toBe("simple");
  });

  it("round-trips save and load", async () => {
    const backend = mockBackend();
    const storage = createFilterStorage(backend);
    const filters = buildFilters({
      searchString: "garage",
      activityTypes: ["TrackPost"],
      minDurationSeconds: 60,
    });
    await storage.save(filters);
    const loaded = await storage.load();
    expect(loaded.searchString).toBe("garage");
    expect(loaded.activityTypes).toEqual(["TrackPost"]);
    expect(loaded.minDurationSeconds).toBe(60);
  });
});
