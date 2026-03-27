import type { PartialDeep } from "type-fest";

// --- SC API response types (raw, fully typed for documentation) ---

interface SCRawBadges {
  pro: boolean;
  creator_mid_tier: boolean;
  pro_unlimited: boolean;
  verified: boolean;
}

interface SCRawUser {
  avatar_url: string;
  first_name: string;
  followers_count: number;
  full_name: string;
  id: number;
  kind: string;
  last_modified: string;
  last_name: string;
  permalink: string;
  permalink_url: string;
  uri: string;
  urn: string;
  username: string;
  verified: boolean;
  city: string | null;
  country_code: string | null;
  badges: SCRawBadges;
  station_urn: string;
  station_permalink: string;
}

interface SCRawTranscodingFormat {
  protocol: "hls" | "progressive";
  mime_type: string;
}

interface SCRawTranscoding {
  url: string;
  preset: string;
  duration: number;
  snipped: boolean;
  format: SCRawTranscodingFormat;
  quality: string;
  is_legacy_transcoding: boolean;
}

interface SCRawPublisherMetadata {
  id: number;
  urn: string;
  artist: string;
  contains_music: boolean;
  isrc: string;
  explicit: boolean;
}

export interface SCRawTrack {
  artwork_url: string | null;
  caption: string | null;
  commentable: boolean;
  comment_count: number;
  created_at: string;
  description: string;
  downloadable: boolean;
  download_count: number;
  duration: number;
  full_duration: number;
  embeddable_by: string;
  genre: string;
  has_downloads_left: boolean;
  id: number;
  kind: string;
  label_name: string;
  last_modified: string;
  license: string;
  likes_count: number;
  permalink: string;
  permalink_url: string;
  playback_count: number;
  public: boolean;
  publisher_metadata: SCRawPublisherMetadata | null;
  purchase_title: string | null;
  purchase_url: string | null;
  release_date: string | null;
  reposts_count: number;
  secret_token: string | null;
  sharing: string;
  state: string;
  streamable: boolean;
  tag_list: string;
  title: string;
  uri: string;
  urn: string;
  user_id: number;
  visuals: unknown;
  waveform_url: string;
  display_date: string;
  media: {
    transcodings: SCRawTranscoding[];
  };
  station_urn: string;
  station_permalink: string;
  track_authorization: string;
  monetization_model: string;
  policy: string;
  user: SCRawUser;
}

interface SCRawPlaylist {
  id: number;
  title: string;
  genre: string;
  tag_list: string;
  user: SCRawUser;
  track_count: number;
  duration: number;
  artwork_url: string | null;
  created_at: string;
  tracks: SCRawTrack[];
}

interface SCRawStreamItem {
  created_at: string;
  type: string;
  user: SCRawUser;
  uuid: string;
  caption: string | null;
  track?: SCRawTrack;
  playlist?: SCRawPlaylist;
}

interface SCRawStreamResponse {
  collection: SCRawStreamItem[];
  next_href: string | null;
  query_urn: string | null;
}

// --- Exported deeply partial types (SC can change their API at any time) ---

export type Deep<T> = PartialDeep<T, { recurseIntoArrays: true }>;

/** @knipignore SC API surface — complete set, intentionally exported */
export type SCBadges = Deep<SCRawBadges>;
export type SCUser = Deep<SCRawUser>;
/** @knipignore */
export type SCTranscodingFormat = Deep<SCRawTranscodingFormat>;
/** @knipignore */
export type SCTranscoding = Deep<SCRawTranscoding>;
/** @knipignore */
export type SCPublisherMetadata = Deep<SCRawPublisherMetadata>;
export type SCTrack = Deep<SCRawTrack>;
export type SCPlaylist = Deep<SCRawPlaylist>;
export type SCStreamItem = Deep<SCRawStreamItem>;
export type SCStreamResponse = Deep<SCRawStreamResponse>;

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

// --- Message protocol ---

export interface FilterUpdateMessage {
  type: "SC_FILTER_UPDATE";
  filters: FilterState;
}

export interface FilterReadyMessage {
  type: "SC_FILTER_READY";
}

export type BridgeMessage = FilterUpdateMessage | FilterReadyMessage;
