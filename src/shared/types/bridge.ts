// --- Content script ↔ Injected script message protocol ---
// Filter sync is handled by ReactiveStore's cross-realm postMessage,
// so no FilterUpdateMessage needed here.

/** Single source of truth for all bridge message type strings. */
export type BridgeMessageTypeValue = (typeof BridgeMessageType)[keyof typeof BridgeMessageType];

export const BridgeMessageType = {
  FilterReady: "SC_FILTER_READY",
  PlayerReady: "SC_PLAYER_READY",
  PlayerCommand: "SC_PLAYER_COMMAND",
  PipSupported: "SC_PIP_SUPPORTED",
  StoreSync: "SC_STORE_SYNC",
} as const;

export interface FilterReadyMessage {
  type: typeof BridgeMessageType.FilterReady;
}

export interface PlayerReadyMessage {
  type: typeof BridgeMessageType.PlayerReady;
}

export interface PlayerCommandMessage {
  type: typeof BridgeMessageType.PlayerCommand;
  payload: PlayerCommand;
}

/** Discriminated union of player commands. Extend with new actions as needed. */
export type PlayerCommand =
  | SeekForwardCommand
  | SeekBackwardCommand
  | TogglePlayCommand
  | SkipNextCommand
  | SkipPrevCommand
  | TogglePipCommand;

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

export interface TogglePipCommand {
  action: "togglePip";
}

export interface PipSupportedMessage {
  type: typeof BridgeMessageType.PipSupported;
}

export type BridgeMessage =
  | FilterReadyMessage
  | PlayerReadyMessage
  | PlayerCommandMessage
  | PipSupportedMessage;
