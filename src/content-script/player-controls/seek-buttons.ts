import type { PlayerCommand, PlayerCommandMessage } from "../../shared/types";
import seekForwardIcon from "./icons/seek-forward.svg?raw";
import seekBackwardIcon from "./icons/seek-backward.svg?raw";

export const SEEK_FWD_BTN_ID = "scf-seek-forward-btn";
export const SEEK_BWD_BTN_ID = "scf-seek-backward-btn";

interface SeekButtonConfig {
  id: string;
  className: string;
  icon: string;
  title: string;
  action: PlayerCommand["action"];
}

function createSeekButton(config: SeekButtonConfig): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = config.id;
  btn.className = `skipControl sc-ir playControls__control sc-button sc-button-secondary sc-button-large sc-button-icon sc-mr-2x ${config.className}`;
  btn.style.marginLeft = "-12px"; // override SC's .sc-mr-2x
  btn.innerHTML = `<div>${config.icon}</div>`;
  btn.title = config.title;

  btn.addEventListener("click", () => {
    const msg: PlayerCommandMessage = {
      type: "SC_PLAYER_COMMAND",
      payload: { action: config.action },
    };
    window.postMessage(msg, "*");
  });

  return btn;
}

/** Create a seek-forward button styled to match SC's player controls. */
export function createSeekForwardButton(): HTMLButtonElement {
  return createSeekButton({
    id: SEEK_FWD_BTN_ID,
    className: "scf-seek-forward",
    icon: seekForwardIcon,
    title: "Seek forward",
    action: "seekForward",
  });
}

/** Create a seek-backward button styled to match SC's player controls. */
export function createSeekBackwardButton(): HTMLButtonElement {
  return createSeekButton({
    id: SEEK_BWD_BTN_ID,
    className: "scf-seek-backward",
    icon: seekBackwardIcon,
    title: "Seek backward",
    action: "seekBackward",
  });
}

/** Update seek button visibility and disabled state. */
export function updateSeekButton(
  btn: HTMLButtonElement,
  opts: { visible: boolean; playerReady: boolean },
): void {
  btn.style.display = opts.visible ? "" : "none";
  btn.classList.toggle("scf-btn-disabled", !opts.playerReady);
  btn.disabled = !opts.playerReady;
}
