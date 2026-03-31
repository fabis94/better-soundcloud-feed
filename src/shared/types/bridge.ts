// --- Content script ↔ Injected script message protocol ---
// Filter sync is handled by ReactiveStore's cross-realm postMessage,
// so no FilterUpdateMessage needed here.

export interface FilterReadyMessage {
  type: "SC_FILTER_READY";
}

export interface PlayerReadyMessage {
  type: "SC_PLAYER_READY";
}

export interface PlayerCommandMessage {
  type: "SC_PLAYER_COMMAND";
  payload: PlayerCommand;
}

/** Discriminated union of player commands. Extend with new actions as needed. */
export type PlayerCommand =
  | SeekForwardCommand
  | SeekBackwardCommand
  | TogglePlayCommand
  | SkipNextCommand
  | SkipPrevCommand;

export interface SeekForwardCommand {
  action: "seekForward";
}

export interface SeekBackwardCommand {
  action: "seekBackward";
}

export interface TogglePlayCommand {
  action: "togglePlay";
}

export interface SkipNextCommand {
  action: "skipNext";
}

export interface SkipPrevCommand {
  action: "skipPrev";
}

export interface PipSupportedMessage {
  type: "SC_PIP_SUPPORTED";
}

export type BridgeMessage =
  | FilterReadyMessage
  | PlayerReadyMessage
  | PlayerCommandMessage
  | PipSupportedMessage;
