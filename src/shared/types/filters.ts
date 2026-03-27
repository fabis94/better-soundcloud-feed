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

export interface FilterState {
  activityTypes: SCActivityType[];
  searchMode: "simple" | "extended";
  searchString: string;
  searchTitle: string;
  searchDescription: string;
  searchGenre: string;
  searchArtist: string;
  searchLabel: string;
  searchOperator: "and" | "or";
  minDurationSeconds: number | null;
  maxDurationSeconds: number | null;
}
