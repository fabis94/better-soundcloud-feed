import { render } from "preact";
import { filterStore } from "../shared/storage";
import { createLogger } from "../shared/logger";
import type { FilterState } from "../shared/types";
import { openHelpModal } from "./components/HelpModal";
import { FilterBar } from "./components/FilterBar";
import { isFeedPage, FILTER_BAR_ID } from "./filter-bar";
import { injectPlayerControls } from "./player-controls";

const log = createLogger("content-script");
log.debug("Content script loaded, pathname: {path}", { path: location.pathname });

// Inject the page-context script before SC's JS runs
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js");
script.onload = () => script.remove();
(document.head ?? document.documentElement).prepend(script);

function renderFilterBar(container: HTMLElement, filters: FilterState): void {
  render(
    <FilterBar
      initialFilters={filters}
      storageAvailable={filterStore.isAvailable()}
      onApply={(f) => filterStore.update(f)}
      onApplyReload={(f) => {
        filterStore.update(f);
        location.reload();
      }}
      onHelp={openHelpModal}
    />,
    container,
  );
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

  const container = document.createElement("div");
  container.id = FILTER_BAR_ID;
  feedContainer.parentElement?.insertBefore(container, feedContainer);

  renderFilterBar(container, filterStore.get());
  log.debug("Filter bar injected into DOM");

  return true;
}

// SPA-aware injection: observe DOM continuously, no debounce.
// injectFilterUI short-circuits via getElementById when bar already exists, so the
// per-mutation cost is negligible. This avoids needing to detect SPA navigation
// (history.pushState can't be intercepted from the content script's isolated world).

const observer = new MutationObserver(() => {
  if (isFeedPage()) injectFilterUI();
  injectPlayerControls(); // Player bar is global, not feed-page-specific
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
