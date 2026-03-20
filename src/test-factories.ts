import type {
  SCUser,
  SCTrack,
  SCPlaylist,
  SCStreamItem,
  SCStreamResponse,
  FilterState,
} from "./types";

let _id = 0;
const nextId = (): number => ++_id;

export function buildUser(overrides: Partial<SCUser> = {}): SCUser {
  const id = nextId();
  return {
    id,
    username: `user-${id}`,
    permalink: `user-${id}`,
    avatar_url: `https://i1.sndcdn.com/avatars-${id}.jpg`,
    first_name: "",
    full_name: "",
    last_name: "",
    kind: "user",
    last_modified: new Date().toISOString(),
    permalink_url: `https://soundcloud.com/user-${id}`,
    uri: `https://api.soundcloud.com/users/soundcloud%3Ausers%3A${id}`,
    urn: `soundcloud:users:${id}`,
    verified: false,
    city: null,
    country_code: null,
    badges: { pro: false, creator_mid_tier: false, pro_unlimited: false, verified: false },
    station_urn: `soundcloud:system-playlists:artist-stations:${id}`,
    station_permalink: `artist-stations:${id}`,
    followers_count: 0,
    ...overrides,
  };
}

export function buildTrack(overrides: Partial<SCTrack> = {}): SCTrack {
  const id = nextId();
  const user = overrides.user ?? buildUser();
  return {
    id,
    title: `Track ${id}`,
    genre: "",
    tag_list: "",
    duration: 180000,
    full_duration: 180000,
    artwork_url: null,
    caption: null,
    commentable: true,
    comment_count: 0,
    created_at: new Date().toISOString(),
    description: "",
    downloadable: false,
    download_count: 0,
    embeddable_by: "all",
    has_downloads_left: false,
    kind: "track",
    label_name: "",
    last_modified: new Date().toISOString(),
    license: "all-rights-reserved",
    likes_count: 0,
    permalink: `track-${id}`,
    permalink_url: `https://soundcloud.com/${user.permalink}/track-${id}`,
    playback_count: 0,
    public: true,
    publisher_metadata: null,
    purchase_title: null,
    purchase_url: null,
    release_date: null,
    reposts_count: 0,
    secret_token: null,
    sharing: "public",
    state: "finished",
    streamable: true,
    uri: `https://api.soundcloud.com/tracks/soundcloud%3Atracks%3A${id}`,
    urn: `soundcloud:tracks:${id}`,
    user_id: user.id,
    visuals: null,
    waveform_url: `https://wave.sndcdn.com/${id}_m.json`,
    display_date: new Date().toISOString(),
    media: { transcodings: [] },
    station_urn: `soundcloud:system-playlists:track-stations:${id}`,
    station_permalink: `track-stations:${id}`,
    track_authorization: "",
    monetization_model: "NOT_APPLICABLE",
    policy: "ALLOW",
    user,
    ...overrides,
  };
}

export function buildPlaylist(overrides: Partial<SCPlaylist> = {}): SCPlaylist {
  const id = nextId();
  return {
    id,
    title: `Playlist ${id}`,
    genre: "",
    tag_list: "",
    user: buildUser(),
    track_count: 5,
    duration: 900000,
    artwork_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildStreamItem(overrides: Partial<SCStreamItem> = {}): SCStreamItem {
  const type = overrides.type ?? "track";
  const user = overrides.user ?? buildUser();
  const base: SCStreamItem = {
    type,
    created_at: new Date().toISOString(),
    user,
    uuid: String(nextId()),
    caption: null,
  };
  if (type === "track" || type === "track-repost") {
    base.track = buildTrack();
  } else {
    base.playlist = buildPlaylist();
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
    types: ["track", "track-repost", "playlist", "playlist-repost"],
    excludeArtists: [],
    genres: [],
    ...overrides,
  };
}
