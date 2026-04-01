import { signal } from "@preact/signals";
import { createLogger } from "../../shared/utils/logger";
import { getArtworkUrl } from "../../shared/utils/format";
import { fetchWaveform, type WaveformData } from "./waveform";

const log = createLogger("pip-poll");

const POLL_INTERVAL_MS = 250;

// --- Feed context types ---

interface FeedContextPlaylist {
  title: string;
  url: string;
  /** Display label: "single", "album", or "playlist". */
  label: string;
}

interface FeedContext {
  verb: "posted" | "reposted";
  /** Only set for reposts (when poster differs from track artist). */
  posterName?: string;
  posterUrl?: string;
  date: string;
  playlist?: FeedContextPlaylist;
}

// --- Reactive state (signals) ---

export const trackTitle = signal("—");
export const trackArtist = signal("—");
export const artworkSrc = signal("");
export const trackUrl = signal<string | null>(null);
export const artistUrl = signal<string | null>(null);
export const currentTimeMs = signal(0);
export const durationMs = signal(0);
export const isPlaying = signal(false);
export const isLiked = signal(false);
export const waveformData = signal<WaveformData | null>(null);
export const feedContext = signal<FeedContext | null>(null);

/** Reset all signals to defaults (call when opening a new PiP session). */
export function resetSignals(): void {
  trackTitle.value = "—";
  trackArtist.value = "—";
  artworkSrc.value = "";
  trackUrl.value = null;
  artistUrl.value = null;
  currentTimeMs.value = 0;
  durationMs.value = 0;
  isPlaying.value = false;
  isLiked.value = false;
  waveformData.value = null;
  feedContext.value = null;
}

export interface PipPoller {
  start(): void;
  stop(): void;
}

function playlistLabel(setType: string | undefined | null): string {
  if (setType === "single") return "single";
  if (setType === "album") return "album";
  return "playlist";
}

/** Extract feed context from the current queue item, or null if unavailable. */
function extractFeedContext(): FeedContext | null {
  const item = window.scPlayer?.getCurrentQueueItem?.();
  if (!item) return null;

  const qi = item;
  if (qi.sourceInfo?.type !== "stream") return null;

  const attrs = qi.originalModel?.attributes;
  const type = attrs?.type;
  if (!type) return null;

  const isRepost = type === "track-repost" || type === "playlist-repost";
  const user = attrs?.user;
  const pl = attrs?.playlist;

  return {
    verb: isRepost ? "reposted" : "posted",
    posterName: isRepost && user?.username ? user.username : undefined,
    posterUrl: isRepost && user?.permalink_url ? user.permalink_url : undefined,
    date: attrs.created_at ?? "",
    playlist: pl?.title
      ? {
          title: pl.title,
          url: pl.permalink_url ?? "",
          label: playlistLabel(pl.set_type),
        }
      : undefined,
  };
}

/** Create a poller that updates PiP signals from SC's player state. */
export function createPipPoller(): PipPoller {
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentTrackId: number | null = null;
  let waveformUrl: string | null = null;
  let cachedLikeBtn: Element | null = null;

  function poll(): void {
    const sound = window.scPlayer?.getCurrentSound?.();
    const trackId = sound?.id ?? null;

    if (trackId !== currentTrackId) {
      currentTrackId = trackId;
      waveformData.value = null;
      cachedLikeBtn = document.querySelector(".playbackSoundBadge__like");
      if (sound) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SC player returns untyped sound model
        const attrs = (sound as any).attributes;
        trackTitle.value = attrs?.title ?? "—";
        trackArtist.value = attrs?.publisher_metadata?.artist || attrs?.user?.username || "—";
        artworkSrc.value = getArtworkUrl(attrs?.artwork_url ?? attrs?.user?.avatar_url);
        trackUrl.value = attrs?.permalink_url ?? null;
        artistUrl.value = attrs?.user?.permalink_url ?? null;
        durationMs.value = sound.player?.getDuration?.() ?? 0;

        const newWfUrl = attrs?.waveform_url;
        if (newWfUrl && newWfUrl !== waveformUrl) {
          waveformUrl = newWfUrl;
          fetchWaveform(newWfUrl).then((data) => {
            if (data && waveformUrl === newWfUrl) {
              waveformData.value = data;
            }
          });
        }

        feedContext.value = extractFeedContext();
      }
    }

    currentTimeMs.value = sound?.player?.getPosition?.() ?? 0;
    isPlaying.value = window.scPlayer?.isPlaying?.() ?? false;
    isLiked.value = cachedLikeBtn?.classList.contains("sc-button-selected") ?? false;
  }

  return {
    start() {
      if (pollTimer) return;
      poll();
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
      log.debug("PiP polling started");
    },
    stop() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
        log.debug("PiP polling stopped");
      }
    },
  };
}
