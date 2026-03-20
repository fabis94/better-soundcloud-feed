import type { FilterState } from "./types";
import { SCActivityType } from "./types";
import { createLogger } from "./logger";

const log = createLogger("storage");

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

function syncToLocalStorage(filters: FilterState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filters));
  } catch (err) {
    log.warn("Failed to sync filters to localStorage", { error: err });
  }
}

export function createFilterStorage(backend: StorageBackend) {
  return {
    async load(): Promise<FilterState> {
      const result = await backend.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      const filters =
        stored && typeof stored === "object"
          ? { ...DEFAULT_FILTERS, ...(stored as Partial<FilterState>) }
          : { ...DEFAULT_FILTERS };
      syncToLocalStorage(filters);
      return filters;
    },

    async save(filters: FilterState): Promise<void> {
      await backend.set({ [STORAGE_KEY]: filters });
      syncToLocalStorage(filters);
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
      return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<FilterState>) };
    }
  } catch (err) {
    log.warn("Failed to load filters from localStorage", { error: err });
  }
  return { ...DEFAULT_FILTERS };
}
