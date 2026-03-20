import type { FilterState, FilterUpdateMessage } from "../shared/types";
import { createChromeFilterStorage, DEFAULT_FILTERS } from "../shared/storage";
import { createLogger } from "../shared/logger";
import { openHelpModal } from "./help-modal";
import {
  FILTER_BAR_ID,
  createFilterBar,
  readFiltersFromUI,
  restoreFiltersToUI,
  wireUpInteractions,
  isFeedPage,
} from "./filter-bar";

const log = createLogger("content-script");
log.debug("Content script loaded, pathname: {path}", { path: location.pathname });

// Inject the page-context script before SC's JS runs
const s = document.createElement("script");
s.src = chrome.runtime.getURL("injected.js");
s.onload = () => s.remove();
(document.head ?? document.documentElement).prepend(s);

const storage = createChromeFilterStorage();

function sendFilters(filters: FilterState): void {
  const msg: FilterUpdateMessage = { type: "SC_FILTER_UPDATE", filters };
  window.postMessage(msg, "*");
}

export function applyFiltersFromUI(bar: HTMLElement): void {
  const filters = readFiltersFromUI(bar);
  sendFilters(filters);
  storage.save(filters);
}

export function injectFilterUI(): boolean {
  if (document.getElementById(FILTER_BAR_ID)) {
    return true;
  }

  const streamList = document.querySelector(".stream__list");
  const streamWild = document.querySelector('[class*="stream"]');
  const main = document.querySelector("main");
  const feedContainer = streamList ?? streamWild ?? main;

  if (!feedContainer) {
    return false;
  }

  log.debug("Feed container found: {tag}.{cls}", {
    tag: feedContainer.tagName,
    cls: feedContainer.className,
  });

  const bar = createFilterBar();
  feedContainer.parentElement?.insertBefore(bar, feedContainer);
  log.debug("Filter bar injected into DOM");

  storage.load().then((filters) => {
    restoreFiltersToUI(bar, filters);
  });

  wireUpInteractions(bar, {
    onApply: applyFiltersFromUI,
    onApplyReload: (b) => {
      applyFiltersFromUI(b);
      location.reload();
    },
    onClear: (b) => restoreFiltersToUI(b, DEFAULT_FILTERS),
    onHelp: openHelpModal,
  });

  return true;
}

// SPA-aware injection: observe DOM continuously, no debounce.
// injectFilterUI short-circuits via getElementById when bar already exists, so the
// per-mutation cost is negligible. This avoids needing to detect SPA navigation
// (history.pushState can't be intercepted from the content script's isolated world).

const observer = new MutationObserver(() => {
  if (isFeedPage()) injectFilterUI();
});

function startObserving(): void {
  observer.observe(document.body, { childList: true, subtree: true });
  // Immediate attempt — container may already exist
  if (isFeedPage()) injectFilterUI();
}

if (document.body) {
  startObserving();
} else {
  document.addEventListener("DOMContentLoaded", () => startObserving());
}
