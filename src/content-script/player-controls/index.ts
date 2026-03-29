import type { BridgeMessage } from "../../shared/types";
import { settingsStore } from "../../shared/settings-store";
import {
  createSeekForwardButton,
  createSeekBackwardButton,
  updateSeekButton,
  SEEK_FWD_BTN_ID,
  SEEK_BWD_BTN_ID,
} from "./seek-buttons";
import { createSettingsButton, updateSettingsButton, SETTINGS_BTN_ID } from "./settings-modal";

let playerReady = false;
let listenerRegistered = false;

function updateSeekBtn(id: string, visible: boolean): void {
  const btn = document.getElementById(id) as HTMLButtonElement | null;
  if (btn) updateSeekButton(btn, { visible, playerReady });
}

function onPlayerReady(): void {
  playerReady = true;

  const settingsEl = document.getElementById(SETTINGS_BTN_ID);
  if (settingsEl) updateSettingsButton(settingsEl, true);

  const visible = settingsStore.get("seekEnabled");
  updateSeekBtn(SEEK_FWD_BTN_ID, visible);
  updateSeekBtn(SEEK_BWD_BTN_ID, visible);
}

function registerPlayerReadyListener(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;

  // Fallback: check if injected script already signalled via data attribute
  if (document.documentElement.dataset["scfPlayerReady"] === "true") {
    onPlayerReady();
  }

  window.addEventListener("message", (e: MessageEvent<BridgeMessage>) => {
    if (e.source !== window || e.data?.type !== "SC_PLAYER_READY") return;
    onPlayerReady();
  });
}

/**
 * Inject extension controls into SC's player bar.
 * Idempotent — short-circuits if already injected. Called from MutationObserver.
 */
export function injectPlayerControls(): boolean {
  registerPlayerReadyListener();

  if (document.getElementById(SETTINGS_BTN_ID)) return true;

  const elements = document.querySelector(".playControls__elements");
  if (!elements) return false;

  // Settings button: right after the timeline
  const timeline = elements.querySelector(".playControls__timeline");
  const settingsBtn = createSettingsButton();
  if (timeline?.nextSibling) {
    elements.insertBefore(settingsBtn, timeline.nextSibling);
  } else {
    elements.appendChild(settingsBtn);
  }
  updateSettingsButton(settingsBtn, playerReady);

  const seekVisible = settingsStore.get("seekEnabled");

  // Seek-backward button: before the prev-track button
  const prevBtn = elements.querySelector(".playControls__prev");
  const seekBwdBtn = createSeekBackwardButton();
  if (prevBtn) {
    elements.insertBefore(seekBwdBtn, prevBtn);
  }
  updateSeekButton(seekBwdBtn, { visible: seekVisible, playerReady });

  // Seek-forward button: after the next-track button
  const nextBtn = elements.querySelector(".playControls__next");
  const seekFwdBtn = createSeekForwardButton();
  if (nextBtn?.nextSibling) {
    elements.insertBefore(seekFwdBtn, nextBtn.nextSibling);
  } else if (nextBtn) {
    elements.appendChild(seekFwdBtn);
  }
  updateSeekButton(seekFwdBtn, { visible: seekVisible, playerReady });

  // React to settings changes
  settingsStore.subscribe((settings) => {
    updateSeekBtn(SEEK_FWD_BTN_ID, settings.seekEnabled);
    updateSeekBtn(SEEK_BWD_BTN_ID, settings.seekEnabled);
  });

  return true;
}
