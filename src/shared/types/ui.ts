/** Persisted UI preferences — neither filters (explicit apply) nor extension settings. */
export interface UiState {
  /** Whether the filter bar's "More filters" section (date, likes, plays) is expanded. */
  advancedFiltersOpen: boolean;
}

export const DEFAULT_UI_STATE: UiState = {
  advancedFiltersOpen: false,
};
