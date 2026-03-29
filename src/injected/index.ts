import type { BridgeMessage, PlayerCommand } from "../shared/types";
import { filterStore } from "../shared/storage";
import { settingsStore } from "../shared/settings-store";
import { createLogger } from "../shared/logger";
import { createFetchInterceptor, patchXHR } from "./intercept";
import { discoverPlayer } from "./player";
import { setupAutoPip } from "./pip";

const log = createLogger("injected");

function handlePlayerCommand(cmd: PlayerCommand): void {
  const sound = window.scPlayer?.getCurrentSound?.();
  if (!sound) return;
  const position = sound.player?.getPosition?.() ?? 0;
  const duration = sound.player?.getDuration?.() ?? 0;
  const amount = settingsStore.get("seekSeconds") * 1000;

  switch (cmd.action) {
    case "seekForward": {
      if (duration > 0 && position + amount > duration * 0.9) {
        window.scPlayer?.playNext?.();
      } else {
        window.scPlayer?.seekCurrentBy?.(() => amount);
      }
      break;
    }
    case "seekBackward": {
      if (duration > 0 && position - amount < duration * 0.1) {
        window.scPlayer?.playPrev?.();
      } else {
        window.scPlayer?.seekCurrentBy?.(() => -amount);
      }
      break;
    }
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
    if (e.source !== window || e.data?.type !== "SC_PLAYER_COMMAND") return;
    if (window.scPlayer) handlePlayerCommand(e.data.payload);
  });

  const originalFetch = window.fetch;
  window.fetch = createFetchInterceptor(originalFetch, getFilters, log);

  patchXHR(getFilters, log);

  // Discover SC's internal player API (polls until webpack modules are loaded)
  discoverPlayer().then((scPlayer) => {
    window.scPlayer = scPlayer;
    log.info("SC player API discovered and assigned to window.scPlayer");
    document.documentElement.dataset["scfPlayerReady"] = "true";
    window.postMessage({ type: "SC_PLAYER_READY" }, "*");
  });

  // Detect Document PiP support
  if ("documentPictureInPicture" in window) {
    document.documentElement.dataset["scfPipSupported"] = "true";
    window.postMessage({ type: "SC_PIP_SUPPORTED" }, "*");
    log.info("Document Picture-in-Picture API is supported");

    setupAutoPip(settingsStore.get("pipAutoEnabled"));
    settingsStore.subscribe((settings) => {
      setupAutoPip(settings.pipAutoEnabled);
    });
  }

  // Signal readiness
  window.postMessage({ type: "SC_FILTER_READY" }, "*");
})();
