import type { FilterState } from "./types";
import { SCActivityType } from "./types";
import { ReactiveStore } from "./store";

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

export const filterStore = new ReactiveStore<FilterState>("bscf_filters", DEFAULT_FILTERS);
