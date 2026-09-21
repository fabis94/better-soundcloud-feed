import type { FilterState } from "../types";
import { SCActivityType, SearchField } from "../types";
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
};

export const filterStore = new ReactiveStore<FilterState>("bscf_filters", DEFAULT_FILTERS);
