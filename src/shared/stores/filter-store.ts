import type { FilterState } from "../types";
import { SCActivityType, SearchField } from "../types";
import { FilterStoreKey, PAGE_CONFIGS, type PageKind } from "../pages";
import { ReactiveStore } from "./reactive-store";

export const DEFAULT_FILTERS: FilterState = {
  activityTypes: Object.values(SCActivityType),
  searchMode: "simple",
  searchString: "",
  searchFields: Object.values(SearchField),
  searchTitle: "",
  searchDescription: "",
  searchGenre: "",
  searchArtist: "",
  searchLabel: "",
  searchOperator: "and",
  minDurationSeconds: null,
  maxDurationSeconds: null,
  createdFrom: null,
  createdTo: null,
  minLikes: null,
  maxLikes: null,
  minPlays: null,
  maxPlays: null,
  minFollowers: null,
  maxFollowers: null,
};

/** Feed (`/feed`) filters. */
export const filterStore = new ReactiveStore<FilterState>(FilterStoreKey.Feed, DEFAULT_FILTERS);

/** Tag-page filters — the Recent and Popular tabs share one state. */
export const tagFilterStore = new ReactiveStore<FilterState>(FilterStoreKey.Tags, DEFAULT_FILTERS);

const STORES: Record<FilterStoreKey, ReactiveStore<FilterState>> = {
  [FilterStoreKey.Feed]: filterStore,
  [FilterStoreKey.Tags]: tagFilterStore,
};

/** The persisted filter store a page kind reads from and writes to. */
export function getFilterStore(kind: PageKind): ReactiveStore<FilterState> {
  return STORES[PAGE_CONFIGS[kind].storeKey];
}
