/** @knipignore SC API surface — complete set, intentionally exported */
export type { Deep, SCRawTrack } from "./sc-api";
/** @knipignore */
export type {
  SCBadges,
  SCUser,
  SCTranscodingFormat,
  SCTranscoding,
  SCPublisherMetadata,
  SCTrack,
  SCPlaylist,
  SCStreamItem,
  SCStreamResponse,
} from "./sc-api";

export { SCActivityType } from "./filters";
/** @knipignore */
export type { SCStreamParams, FilterState } from "./filters";

/** @knipignore bridge protocol — complete set */
export type {
  BridgeMessage,
  FilterReadyMessage,
  PlayerReadyMessage,
  PlayerCommandMessage,
  PlayerCommand,
  SeekForwardCommand,
  SeekBackwardCommand,
  PipSupportedMessage,
} from "./bridge";

/** @knipignore SC player API surface — complete set */
export type { SCAudioPlayer, SCSoundModel, SCQueueState, SCPlayer } from "./player";

export type { ExtensionSettings } from "./settings";
export { DEFAULT_SETTINGS } from "./settings";
