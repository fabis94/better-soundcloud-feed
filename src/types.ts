// --- SC API response types ---

export interface SCBadges {
  pro: boolean;
  creator_mid_tier: boolean;
  pro_unlimited: boolean;
  verified: boolean;
}

export interface SCUser {
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
  badges: SCBadges;
  station_urn: string;
  station_permalink: string;
}

export interface SCTranscodingFormat {
  protocol: 'hls' | 'progressive';
  mime_type: string;
}

export interface SCTranscoding {
  url: string;
  preset: string;
  duration: number;
  snipped: boolean;
  format: SCTranscodingFormat;
  quality: string;
  is_legacy_transcoding: boolean;
}

export interface SCPublisherMetadata {
  id: number;
  urn: string;
  artist: string;
  contains_music: boolean;
  isrc: string;
  explicit: boolean;
}

export interface SCTrack {
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
  publisher_metadata: SCPublisherMetadata | null;
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
    transcodings: SCTranscoding[];
  };
  station_urn: string;
  station_permalink: string;
  track_authorization: string;
  monetization_model: string;
  policy: string;
  user: SCUser;
}

export interface SCPlaylist {
  id: number;
  title: string;
  genre: string;
  tag_list: string;
  user: SCUser;
  track_count: number;
  duration: number;
  artwork_url: string | null;
  created_at: string;
}

export type SCStreamItemType =
  | 'track'
  | 'track-repost'
  | 'playlist'
  | 'playlist-repost';

export interface SCStreamItem {
  created_at: string;
  type: SCStreamItemType;
  user: SCUser;
  uuid: string;
  caption: string | null;
  track?: SCTrack;
  playlist?: SCPlaylist;
}

export interface SCStreamResponse {
  collection: SCStreamItem[];
  next_href: string | null;
  query_urn: string | null;
}

// --- Stream endpoint query params ---

export type SCActivityType = 'TrackPost' | 'TrackRepost' | 'PlaylistPost';

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
  types: SCStreamItemType[];
  excludeArtists: string[];
  genres: string[];
}

// --- Message protocol ---

export interface FilterUpdateMessage {
  type: 'SC_FILTER_UPDATE';
  filters: FilterState;
}

export interface FilterReadyMessage {
  type: 'SC_FILTER_READY';
}

export type BridgeMessage = FilterUpdateMessage | FilterReadyMessage;
