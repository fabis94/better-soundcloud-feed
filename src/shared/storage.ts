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

const STORAGE_KEY = "sc-feed-filters-sync";

export const filterStorage = {
  load(): FilterState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return {
          ...DEFAULT_FILTERS,
          ...(JSON.parse(raw) as Partial<FilterState>),
        };
      }
    } catch (err) {
      log.error("Failed to load filters from localStorage", { error: err });
    }
    return { ...DEFAULT_FILTERS };
  },

  save(filters: FilterState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (err) {
      log.error("Failed to save filters to localStorage", { error: err });
    }
  },

  isAvailable(): boolean {
    try {
      const testKey = "__sc_filter_storage_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      log.error("localStorage is not available — filters cannot be persisted across reloads");
      return false;
    }
  },
};
