import type { SCUser, SCTrack, SCPlaylist, SCStreamItem, SCStreamResponse, FilterState } from './types';

let _id = 0;
const nextId = (): number => ++_id;

export function buildUser(overrides: Partial<SCUser> = {}): SCUser {
  const id = nextId();
  return {
    id,
    username: `user-${id}`,
    permalink: `user-${id}`,
    avatar_url: `https://i1.sndcdn.com/avatars-${id}.jpg`,
    ...overrides,
  };
}

export function buildTrack(overrides: Partial<SCTrack> = {}): SCTrack {
  const id = nextId();
  return {
    id,
    title: `Track ${id}`,
    genre: '',
    tag_list: '',
    duration: 180000,
    artwork_url: null,
    user: buildUser(),
    streamable: true,
    access: 'playable',
    media: { transcodings: [] },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildPlaylist(overrides: Partial<SCPlaylist> = {}): SCPlaylist {
  const id = nextId();
  return {
    id,
    title: `Playlist ${id}`,
    genre: '',
    tag_list: '',
    user: buildUser(),
    track_count: 5,
    duration: 900000,
    artwork_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildStreamItem(overrides: Partial<SCStreamItem> = {}): SCStreamItem {
  const type = overrides.type ?? 'track';
  const base: SCStreamItem = {
    type,
    created_at: new Date().toISOString(),
  };
  if (type === 'track' || type === 'track-repost') {
    base.track = buildTrack();
  } else {
    base.playlist = buildPlaylist();
  }
  if (type === 'track-repost' || type === 'playlist-repost') {
    base.user = buildUser();
  }
  return { ...base, ...overrides };
}

export function buildStreamResponse(overrides: Partial<SCStreamResponse> = {}): SCStreamResponse {
  return {
    collection: [buildStreamItem()],
    next_href: null,
    query_urn: null,
    ...overrides,
  };
}

export function buildFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    types: ['track', 'track-repost', 'playlist', 'playlist-repost'],
    excludeArtists: [],
    genres: [],
    ...overrides,
  };
}
