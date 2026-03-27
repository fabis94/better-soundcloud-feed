import type { BridgeMessage } from "../../shared/types";
import { settingsStore } from "../../shared/settings-store";
import { createSkipButton, updateSkipButton, SKIP_BTN_ID } from "./skip-button";
import { createSettingsButton, updateSettingsButton, SETTINGS_BTN_ID } from "./settings-modal";

let playerReady = false;
let listenerRegistered = false;

function onPlayerReady(): void {
  playerReady = true;

  const settingsEl = document.getElementById(SETTINGS_BTN_ID);
  if (settingsEl) updateSettingsButton(settingsEl, true);

  const skipBtn = document.getElementById(SKIP_BTN_ID) as HTMLButtonElement | null;
  if (skipBtn) {
    updateSkipButton(skipBtn, {
      visible: settingsStore.get("skipForwardEnabled"),
      playerReady: true,
    });
  }
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

  // Skip-forward button: after the next-track button
  const nextBtn = elements.querySelector(".playControls__next");
  const skipBtn = createSkipButton();
  if (nextBtn?.nextSibling) {
    elements.insertBefore(skipBtn, nextBtn.nextSibling);
  } else if (nextBtn) {
    elements.appendChild(skipBtn);
  }
  updateSkipButton(skipBtn, {
    visible: settingsStore.get("skipForwardEnabled"),
    playerReady,
  });

  // React to settings changes
  settingsStore.subscribe((settings) => {
    const btn = document.getElementById(SKIP_BTN_ID) as HTMLButtonElement | null;
    if (btn) {
      updateSkipButton(btn, { visible: settings.skipForwardEnabled, playerReady });
    }
  });

  return true;
}
