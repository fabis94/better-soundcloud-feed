import { BridgeMessageType, type BridgeMessage, type PlayerCommand } from "../shared/types";
import { filterStore } from "../shared/storage";
import { settingsStore } from "../shared/settings-store";
import { createLogger } from "../shared/logger";
import { createFetchInterceptor, patchXHR } from "./intercept";
import { discoverPlayer } from "./player";
import { discoverSocialActions } from "./social";
import { seekOrSkip } from "./seek";
import { setupAutoPip } from "./pip/index";

const log = createLogger("injected");

function handlePlayerCommand(cmd: PlayerCommand): void {
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
  }
}

(function () {
  log.debug("Initial filters loaded from localStorage", {
    filters: filterStore.get(),
  });

  // getFilters always returns the latest state — cross-realm sync via
  // ReactiveStore means filterStore.get() reflects updates from the
  // content script automatically (no manual SC_FILTER_UPDATE needed).
  const getFilters = () => filterStore.get();

  // Player commands still use explicit messages since they're transient
  // actions, not persisted state.
  window.addEventListener("message", (e: MessageEvent<BridgeMessage>) => {
    if (e.source !== window || e.data?.type !== BridgeMessageType.PlayerCommand) return;
    if (window.scPlayer) handlePlayerCommand(e.data.payload);
  });

  const originalFetch = window.fetch;
  window.fetch = createFetchInterceptor(originalFetch, getFilters, log);

  patchXHR(getFilters, log);

  // Discover SC's internal player API (polls until webpack modules are loaded)
  // Signalling (dataset + bridge message) is handled inside discoverPlayer().
  discoverPlayer().then((scPlayer) => {
    window.scPlayer = scPlayer;
    log.info("SC player API discovered and assigned to window.scPlayer");
  });

  // Discover SC's social actions module (like/repost)
  discoverSocialActions().then((socialActions) => {
    window.scSocialActions = socialActions;
    log.info("SC social actions discovered");
  });

  // Detect Document PiP support
  if ("documentPictureInPicture" in window) {
    document.documentElement.dataset["scfPipSupported"] = "true";
    window.postMessage({ type: BridgeMessageType.PipSupported }, "*");
    log.info("Document Picture-in-Picture API is supported");

    setupAutoPip(settingsStore.get("pipAutoEnabled"));
    settingsStore.subscribe((settings) => {
      setupAutoPip(settings.pipAutoEnabled);
    });
  }

  // Signal readiness
  window.postMessage({ type: BridgeMessageType.FilterReady }, "*");
})();
