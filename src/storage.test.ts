import { describe, it, expect, vi } from '@voidzero-dev/vite-plus-test';
import { createFilterStorage } from './storage';
import type { StorageBackend } from './storage';
import { buildFilters } from './test-factories';

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

describe('createFilterStorage', () => {
  it('returns defaults when storage is empty', async () => {
    const storage = createFilterStorage(mockBackend());
    const filters = await storage.load();
    expect(filters.types).toHaveLength(4);
    expect(filters.excludeArtists).toEqual([]);
    expect(filters.genres).toEqual([]);
  });

  it('merges stored values with defaults', async () => {
    const backend = mockBackend({
      'sc-feed-filters': { excludeArtists: ['spammer'] },
    });
    const storage = createFilterStorage(backend);
    const filters = await storage.load();
    expect(filters.excludeArtists).toEqual(['spammer']);
    expect(filters.types).toHaveLength(4);
  });

  it('round-trips save and load', async () => {
    const backend = mockBackend();
    const storage = createFilterStorage(backend);
    const filters = buildFilters({ genres: ['garage', 'dubstep'] });
    await storage.save(filters);
    const loaded = await storage.load();
    expect(loaded.genres).toEqual(['garage', 'dubstep']);
  });
});
