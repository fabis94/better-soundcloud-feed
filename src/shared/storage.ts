import type { FilterState } from "./types";
import { SCActivityType } from "./types";

export const DEFAULT_FILTERS: FilterState = {
  activityTypes: Object.values(SCActivityType),
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
};

const STORAGE_KEY = "sc-feed-filters";
const LOCAL_STORAGE_KEY = "sc-feed-filters-sync";

export interface StorageBackend {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export function createFilterStorage(backend: StorageBackend) {
  return {
    async load(): Promise<FilterState> {
      const result = await backend.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      const filters = stored && typeof stored === "object"
        ? { ...DEFAULT_FILTERS, ...(stored as Partial<FilterState>) }
        : { ...DEFAULT_FILTERS };
      // Keep localStorage in sync for page-context scripts
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filters));
      } catch {
        // localStorage may be blocked
      }
      return filters;
    },

    async save(filters: FilterState): Promise<void> {
      await backend.set({ [STORAGE_KEY]: filters });
      // Mirror to localStorage for sync access from page-context (injected.js)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filters));
      } catch {
        // localStorage may be blocked by privacy settings
      }
    },
  };
}

export function createChromeFilterStorage() {
  return createFilterStorage(chrome.storage.local);
}

/** Synchronously load filters from localStorage (for page-context scripts). */
export function loadFiltersSync(): FilterState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_FILTERS, ...JSON.parse(raw) as Partial<FilterState> };
    }
  } catch {
    // localStorage may be unavailable
  }
  return { ...DEFAULT_FILTERS };
}
