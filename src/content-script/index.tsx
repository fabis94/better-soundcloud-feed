import { render } from "preact";
import { getFilterStore } from "../shared/stores/filter-store";
import { uiStore } from "../shared/stores/ui-store";
import { createLogger } from "../shared/utils/logger";
import { PageKind, PAGE_CONFIGS, resolvePageKind } from "../shared/pages";
import { openHelpModal } from "./components/HelpModal";
import { FilterBar } from "./components/FilterBar";
import { FILTER_BAR_ID } from "./feed/filter-bar";
import { injectPlayerControls } from "./player-controls";

const log = createLogger("content-script");
log.debug("Content script loaded, pathname: {path}", { path: location.pathname });

// NOTE: injected.js is not loaded from here. manifest.json declares it as a
// `world: "MAIN"` content script at document_start so it patches fetch/XHR
// synchronously before any SC script runs. A dynamically inserted <script> tag
// is async and would race SC's first /stream request. On browsers without
// `world` support the injected bundle detects the isolated world itself and
// falls back to a <script> tag (see src/injected/world.ts).

function renderFilterBar(container: HTMLElement, kind: PageKind): void {
  const store = getFilterStore(kind);
  render(
    <FilterBar
      initialFilters={store.get()}
      storageAvailable={store.isAvailable()}
      ui={PAGE_CONFIGS[kind].ui}
      initialAdvancedOpen={uiStore.get("advancedFiltersOpen")}
      onAdvancedOpenChange={(open) => uiStore.update({ advancedFiltersOpen: open })}
      onApplyReload={(f) => {
        store.update(f);
        location.reload();
      }}
      onHelp={openHelpModal}
    />,
    container,
  );
}

function findTagAnchor(): Element | null {
  // SC keeps .tabs__content across Recent/Popular/Playlists tab switches and only
  // rebuilds the list inside .tabs__contentSlot, so a bar placed before the slot survives.
  return document.querySelector(".tagsMain .tabs__contentSlot");
}

/** Per page kind: the element the bar is inserted in front of. */
const FILTER_BAR_ANCHORS: Record<PageKind, () => Element | null> = {
  [PageKind.Feed]: () =>
    document.querySelector(".stream__list") ??
    document.querySelector('[class*="stream"]') ??
    document.querySelector("main"),
  [PageKind.TagRecent]: findTagAnchor,
  [PageKind.TagPopular]: findTagAnchor,
};

function removeFilterUI(bar: HTMLElement): void {
  render(null, bar);
  bar.remove();
  log.debug("Filter bar removed");
}

/**
 * Mount the bar for a page kind. A bar bound to another filter store (feed vs
 * tags) is torn down first so the new one starts from the right state.
 */
export function injectFilterUI(kind: PageKind): boolean {
  const { storeKey } = PAGE_CONFIGS[kind];
  const existing = document.getElementById(FILTER_BAR_ID);
  if (existing) {
    if (existing.dataset["storeKey"] === storeKey) return true;
    removeFilterUI(existing);
  }

  const anchor = FILTER_BAR_ANCHORS[kind]();
  if (!anchor?.parentElement) {
    return false;
  }

  log.debug("Filter bar anchor found for {kind}: {tag}.{cls}", {
    kind,
    tag: anchor.tagName,
    cls: anchor.className,
  });

  const container = document.createElement("div");
  container.id = FILTER_BAR_ID;
  container.dataset["storeKey"] = storeKey;
  anchor.parentElement.insertBefore(container, anchor);

  renderFilterBar(container, kind);
  log.debug("Filter bar injected into DOM");

  return true;
}

/**
 * Reconcile the bar with the current page: mount it on supported pages, remove
 * it everywhere else (e.g. the tag page's Playlists tab, which SC renders into
 * the same container).
 */
export function syncFilterUI(pathname: string): void {
  const kind = resolvePageKind(pathname);
  if (kind) {
    injectFilterUI(kind);
    return;
  }
  const existing = document.getElementById(FILTER_BAR_ID);
  if (existing) removeFilterUI(existing);
}

// SPA-aware injection: observe DOM continuously, no debounce.
// injectFilterUI short-circuits via getElementById when the bar already exists, so the
// per-mutation cost is negligible. This avoids needing to detect SPA navigation
// (history.pushState can't be intercepted from the content script's isolated world).

const observer = new MutationObserver(() => {
  syncFilterUI(location.pathname);
  injectPlayerControls(); // Player bar is global, not page-specific
});

function startObserving(): void {
  observer.observe(document.body, { childList: true, subtree: true });
  // Immediate attempt — container may already exist
  syncFilterUI(location.pathname);
}

if (document.body) {
  startObserving();
} else {
  document.addEventListener("DOMContentLoaded", () => startObserving());
}
