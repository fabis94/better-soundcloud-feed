// --- Stream endpoint query params ---

export const SCActivityType = {
  TrackPost: "TrackPost",
  TrackRepost: "TrackRepost",
  PlaylistPost: "PlaylistPost",
} as const;

export type SCActivityType = (typeof SCActivityType)[keyof typeof SCActivityType];

/** @knipignore */
export interface SCStreamParams {
  sc_a_id: string;
  device_locale: string;
  consent_string: string;
  tcf_version: number;
  user_urn: string;
  promoted_playlist: boolean;
  activityTypes: SCActivityType[];
  client_id: string;
  limit: number;
  offset: number;
  linked_partitioning: number;
  app_version: number;
  app_locale: string;
}

// --- Filter types ---

/**
 * Areas of a stream item that search can look at. Single source of truth:
 * derive arrays via `Object.values()`, labels via `formatSearchField()`.
 * Extended mode has one input per area; simple mode searches the ticked areas.
 */
export const SearchField = {
  Title: "title",
  Description: "description",
  Genre: "genre",
  Artist: "artist",
  Label: "label",
} as const;

export type SearchField = (typeof SearchField)[keyof typeof SearchField];

export interface FilterState {
  activityTypes: SCActivityType[];
  searchMode: "simple" | "extended";
  searchString: string;
  /** Simple mode only: which areas `searchString` is matched against. Empty = search ignored. */
  searchFields: SearchField[];
  searchTitle: string;
  searchDescription: string;
  searchGenre: string;
  searchArtist: string;
  searchLabel: string;
  searchOperator: "and" | "or";
  minDurationSeconds: number | null;
  maxDurationSeconds: number | null;
}
