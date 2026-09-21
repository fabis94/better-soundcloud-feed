import { BridgeMessageType, type BridgeMessage } from "../shared/types";
import { filterStore } from "../shared/stores/filter-store";
import { settingsStore } from "../shared/stores/settings-store";
import { createLogger } from "../shared/utils/logger";
import { createFetchInterceptor, patchXHR } from "./intercept";
import { discoverPlayer } from "./discovery/player";
import { discoverSocialActions } from "./discovery/social";
import { handlePlayerCommand } from "./player/commands";
import { setupAutoPip } from "./pip/index";
import { isIsolatedWorld, injectViaScriptTag, detectLoadStyle } from "./world";

const log = createLogger("injected");

(function () {
  // Browsers without `world: "MAIN"` support (Chrome/Edge < 111, Firefox < 128)
  // ignore the manifest key and run this file in the isolated world, where
  // patching fetch does nothing. Load ourselves into the page the legacy way
  // (async <script> tag) and stop here — the page-world copy does the work.
  if (isIsolatedWorld()) {
    log.info(
      "Running in isolated world (browser ignored world: MAIN), loading page copy via <script> tag fallback",
    );
    injectViaScriptTag();
    return;
  }

  log.debug("Injected script running in page world, loaded via {loadStyle}", {
    loadStyle: detectLoadStyle(),
  });

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
