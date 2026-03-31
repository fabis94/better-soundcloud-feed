import type { PlayerCommand } from "../../shared/types";
import { seekOrSkip } from "./seek";
import { togglePip } from "../pip/index";

/** Dispatch a player command to SC's internal player API. */
export function handlePlayerCommand(cmd: PlayerCommand): void {
  switch (cmd.action) {
    case "seekForward":
      seekOrSkip(1);
      break;
    case "seekBackward":
      seekOrSkip(-1);
      break;
    case "togglePlay":
      window.scPlayer?.toggleCurrent?.();
      break;
    case "skipNext":
      window.scPlayer?.playNext?.();
      break;
    case "skipPrev":
      window.scPlayer?.playPrev?.();
      break;
    case "togglePip":
      togglePip();
      break;
  }
}
