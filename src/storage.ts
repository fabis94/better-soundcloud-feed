import type { FilterState, SCStreamItemType } from './types';

const DEFAULT_FILTERS: FilterState = {
  types: ['track', 'track-repost', 'playlist', 'playlist-repost'] satisfies SCStreamItemType[],
  excludeArtists: [],
  genres: [],
};

const STORAGE_KEY = 'sc-feed-filters';

export interface StorageBackend {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export function createFilterStorage(backend: StorageBackend) {
  return {
    async load(): Promise<FilterState> {
      const result = await backend.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      if (stored && typeof stored === 'object') {
        return { ...DEFAULT_FILTERS, ...(stored as Partial<FilterState>) };
      }
      return { ...DEFAULT_FILTERS };
    },

    async save(filters: FilterState): Promise<void> {
      await backend.set({ [STORAGE_KEY]: filters });
    },
  };
}

export function createChromeFilterStorage() {
  return createFilterStorage(chrome.storage.local);
}
