import type { FilterState, BridgeMessage } from "../shared/types";
import { loadFiltersSync } from "../shared/storage";
import { createLogger } from "../shared/logger";
import { createFetchInterceptor, patchXHR } from "./intercept";

const log = createLogger("injected");

(function () {
  let currentFilters: FilterState = loadFiltersSync();
  log.debug("Initial filters loaded from localStorage", { filters: currentFilters });

  const getFilters = () => currentFilters;

  window.addEventListener("message", (e: MessageEvent<BridgeMessage>) => {
    if (e.source !== window || e.data?.type !== "SC_FILTER_UPDATE") return;
    currentFilters = e.data.filters;
    log.debug("Filters updated via message", { filters: currentFilters });
  });

  const originalFetch = window.fetch;
  window.fetch = createFetchInterceptor(originalFetch, getFilters, log);

  patchXHR(getFilters, log);

  // Signal readiness
  window.postMessage({ type: "SC_FILTER_READY" }, "*");
})();
