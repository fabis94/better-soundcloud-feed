// --- SC API response types ---

export interface SCUser {
  id: number;
  username: string;
  permalink: string;
  avatar_url: string;
}

export interface SCTranscoding {
  url: string;
  preset: string;
  duration: number;
  format: {
    protocol: string;
    mime_type: string;
  };
}

export interface SCTrack {
  id: number;
  title: string;
  genre: string;
  tag_list: string;
  duration: number;
  artwork_url: string | null;
  user: SCUser;
  streamable: boolean;
  access: string;
  media: {
    transcodings: SCTranscoding[];
  };
  created_at: string;
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
  type: SCStreamItemType;
  created_at: string;
  track?: SCTrack;
  playlist?: SCPlaylist;
  user?: SCUser;
}

export interface SCStreamResponse {
  collection: SCStreamItem[];
  next_href: string | null;
  query_urn: string | null;
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
