import type { PlayerCommandMessage } from "../../shared/types";
import skipForwardIcon from "./icons/skip-forward.svg?raw";

export const SKIP_BTN_ID = "scf-skip-forward-btn";

/** Create a skip-forward button styled to match SC's skip controls. */
export function createSkipButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = SKIP_BTN_ID;
  btn.className =
    "skipControl sc-ir playControls__control sc-button sc-button-secondary sc-button-large sc-button-icon sc-mr-2x scf-skip-forward";
  btn.style.marginLeft = "-12px"; // override SC's .sc-mr-2x
  btn.innerHTML = `<div>${skipForwardIcon}</div>`;
  btn.title = "Skip forward";

  btn.addEventListener("click", () => {
    const msg: PlayerCommandMessage = {
      type: "SC_PLAYER_COMMAND",
      payload: { action: "skipForward" },
    };
    window.postMessage(msg, "*");
  });

  return btn;
}

/** Update skip button visibility and disabled state. */
export function updateSkipButton(
  btn: HTMLButtonElement,
  opts: { visible: boolean; playerReady: boolean },
): void {
  btn.style.display = opts.visible ? "" : "none";
  btn.classList.toggle("scf-btn-disabled", !opts.playerReady);
  btn.disabled = !opts.playerReady;
}
