import type { FilterState, BridgeMessage } from "../shared/types";
import { filterStorage } from "../shared/storage";
import { createLogger } from "../shared/logger";
import { createFetchInterceptor, patchXHR } from "./intercept";
import { discoverPlayer } from "./player";

const log = createLogger("injected");

(function () {
  let currentFilters: FilterState = filterStorage.load();
  log.debug("Initial filters loaded from localStorage", {
    filters: currentFilters,
  });

  const getFilters = () => currentFilters;

  window.addEventListener("message", (e: MessageEvent<BridgeMessage>) => {
    if (e.source !== window || e.data?.type !== "SC_FILTER_UPDATE") return;
    currentFilters = e.data.filters;
    log.debug("Filters updated via message", { filters: currentFilters });
  });

  const originalFetch = window.fetch;
  window.fetch = createFetchInterceptor(originalFetch, getFilters, log);

  patchXHR(getFilters, log);

  // Discover SC's internal player API (polls until webpack modules are loaded)
  discoverPlayer().then((scPlayer) => {
    window.scPlayer = scPlayer;
    log.info("SC player API discovered and assigned to window.scPlayer");
  });

  // Signal readiness
  window.postMessage({ type: "SC_FILTER_READY" }, "*");
})();
