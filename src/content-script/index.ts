import type { FilterState, FilterUpdateMessage } from "../shared/types";
import { filterStorage, DEFAULT_FILTERS } from "../shared/storage";
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
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js");
script.onload = () => script.remove();
(document.head ?? document.documentElement).prepend(script);

function sendFilters(filters: FilterState): void {
  const msg: FilterUpdateMessage = { type: "SC_FILTER_UPDATE", filters };
  window.postMessage(msg, "*");
}

export function applyFiltersFromUI(bar: HTMLElement): void {
  const filters = readFiltersFromUI(bar);
  sendFilters(filters);
  filterStorage.save(filters);
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

  const filters = filterStorage.load();
  restoreFiltersToUI(bar, filters);

  const storageAvailable = filterStorage.isAvailable();
  if (!storageAvailable) {
    const reloadBtn = bar.querySelector<HTMLButtonElement>("#scf-apply-reload");
    if (reloadBtn) {
      reloadBtn.disabled = true;
      reloadBtn.title = "localStorage is blocked — filters cannot persist across reloads";
    }
  }

  wireUpInteractions(bar, {
    onApply: applyFiltersFromUI,
    onApplyReload: (bar) => {
      applyFiltersFromUI(bar);
      location.reload();
    },
    onClear: (bar) => restoreFiltersToUI(bar, DEFAULT_FILTERS),
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
