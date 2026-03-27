import type { Deep, SCRawTrack } from "./sc-api";

// --- SC internal player types (raw, fully typed for documentation) ---

/** Low-level audio controller backing a sound model (`sound.player`). */
interface SCRawAudioPlayer {
  /** Current playback position in milliseconds. */
  getPosition(): number;
  /** Total track duration in milliseconds. */
  getDuration(): number;
  /** Cumulative listen time in milliseconds. */
  getListenTime(): number;
  isPlaying(): boolean;
  isLoading(): boolean;
  isEnded(): boolean;
  /** Seek to an absolute position in milliseconds. */
  seek(positionMs: number): void;
  play(): void;
  pause(): void;
  getQuality(): string;
  kill(): void;
}

/** Backbone-style sound model returned by `getCurrentSound()`. */
interface SCRawSoundModel {
  /** Track metadata — same shape as the SC stream API track object. */
  attributes: SCRawTrack;
  /** Low-level audio controller for this sound. */
  player: SCRawAudioPlayer;
  id: number;

  // Playback
  play(): void;
  pause(): void;
  /** Seek to an absolute position in milliseconds. */
  seek(positionMs: number): void;
  /** Seek relative to current position (clamped to 0..duration). */
  seekRelative(offsetMs: number): void;
  isPlaying(): boolean;
  isBuffering(): boolean;
  isPlayable(): boolean;

  // Timing
  /** Track duration in milliseconds. */
  duration(): number;
  /** Current playback time in milliseconds. */
  currentTime(): number;
  /** Media duration in milliseconds (excludes snipped preview padding). */
  getMediaDuration(): number;
  /** Playback progress as a 0–1 fraction. */
  progress(): number;
  /** Buffering progress as a 0–1 fraction. */
  loadProgress(): number;

  // Playlist sounds
  getSounds(): SCRawSoundModel[];
  getNumSounds(): number;
}

interface SCRawQueueState {
  currentIndex: number;
  /** Observed values: `"none"`, `"one"`, `"all"`. */
  repeatMode: string;
}

/**
 * Top-level playback controller discovered from SC's webpack module cache.
 *
 * Backbone event emitter — use `on`/`off`/`once` to subscribe to playback events.
 */
interface SCRawPlayer {
  // --- Playback control ---

  /** Resume playback of the current track. */
  playCurrent(options?: Record<string, unknown>): void;
  /** Pause the current track. Pass `{ seek: 0 }` to also reset position. */
  pauseCurrent(options?: Record<string, unknown>): void;
  /** Toggle play/pause on the current track. */
  toggleCurrent(options?: Record<string, unknown>): void;
  /**
   * Seek to an absolute position. Takes a callback `(sound) => positionMs`
   * that receives the current sound model and returns the target position.
   */
  seekCurrentTo(positionFn: (sound: SCRawSoundModel) => number): void;
  /**
   * Seek by a relative offset. Takes a callback `(sound) => offsetMs`
   * that receives the current sound model and returns the offset.
   */
  seekCurrentBy(offsetFn: (sound: SCRawSoundModel) => number): void;
  /** Skip to the next track in the queue. */
  playNext(options?: Record<string, unknown>): void;
  /** Go back to the previous track in the queue. */
  playPrev(options?: Record<string, unknown>): void;

  // --- State queries ---

  isPlaying(): boolean;
  /** Returns the current sound model, or `null` if nothing is loaded. */
  getCurrentSound(): SCRawSoundModel | null;
  getCurrentQueueItem(): unknown;
  getCurrentMetadata(): unknown;
  hasNextSound(): boolean;
  hasCurrentSound(): boolean;
  hasMoreAhead(): boolean;
  hasMoreBehind(): boolean;

  // --- Queue management ---

  getQueue(): unknown;
  getQueueState(): SCRawQueueState;
  clearQueue(): void;
  toggleShuffle(): void;
  /** Cycle through repeat modes: none → one → all → none. */
  cycleRepeatMode(): void;
  setRepeatMode(mode: string): void;

  // --- Source control ---

  isSourcePlaying(source: unknown): boolean;
  isSourceActive(source: unknown): boolean;

  // --- Backbone events ---

  on(event: string, callback: (...args: unknown[]) => void, context?: unknown): void;
  off(event: string, callback?: (...args: unknown[]) => void, context?: unknown): void;
  once(event: string, callback: (...args: unknown[]) => void, context?: unknown): void;
  trigger(event: string, ...args: unknown[]): void;
}

// --- Exported deeply partial types (SC can change their internals at any time) ---

/** @knipignore SC player API surface — complete set, intentionally exported */
export type SCAudioPlayer = Deep<SCRawAudioPlayer>;
/** @knipignore */
export type SCSoundModel = Deep<SCRawSoundModel>;
/** @knipignore */
export type SCQueueState = Deep<SCRawQueueState>;
export type SCPlayer = Deep<SCRawPlayer>;

// --- Window augmentation ---

declare global {
  interface Window {
    scPlayer?: SCPlayer;
  }
}
