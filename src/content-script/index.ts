import type { FilterState, FilterUpdateMessage, SCActivityType } from "../shared/types";
import { createChromeFilterStorage, DEFAULT_FILTERS } from "../shared/storage";
import { createLogger } from "../shared/logger";
import { openHelpModal } from "./help-modal";

const log = createLogger("content-script");
log.debug("Content script loaded, pathname: {path}", { path: location.pathname });

const FILTER_BAR_ID = "sc-feed-filter-bar";

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

function createFilterBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.id = FILTER_BAR_ID;

  bar.innerHTML = `
    <div class="scf-row">
      <label class="scf-label">Show:</label>
      <label class="scf-check"><input type="checkbox" data-activity="TrackPost" checked> Tracks</label>
      <label class="scf-check"><input type="checkbox" data-activity="TrackRepost" checked> Reposts</label>
      <label class="scf-check"><input type="checkbox" data-activity="PlaylistPost" checked> Playlists</label>
    </div>
    <div class="scf-row">
      <label class="scf-label">Search:</label>
      <div class="scf-pill" id="scf-operator">
        <button type="button" class="scf-pill-btn scf-pill-active" data-op="and">All</button>
        <button type="button" class="scf-pill-btn" data-op="or">Any</button>
      </div>
      <div class="scf-search-simple">
        <input type="text" class="scf-input" id="scf-search" placeholder="comma-separated, -exclude, wild*card">
      </div>
      <div class="scf-search-extended" style="display:none">
        <div class="scf-ext-row"><label class="scf-ext-label">Title</label><input type="text" class="scf-input" id="scf-search-title" placeholder="title filter"></div>
        <div class="scf-ext-row"><label class="scf-ext-label">Description</label><input type="text" class="scf-input" id="scf-search-desc" placeholder="description filter"></div>
        <div class="scf-ext-row"><label class="scf-ext-label">Genre</label><input type="text" class="scf-input" id="scf-search-genre" placeholder="genre filter"></div>
        <div class="scf-ext-row"><label class="scf-ext-label">Artist</label><input type="text" class="scf-input" id="scf-search-artist" placeholder="artist/reposter filter"></div>
        <div class="scf-ext-row"><label class="scf-ext-label">Label</label><input type="text" class="scf-input" id="scf-search-label" placeholder="label/publisher filter"></div>
      </div>
    </div>
    <div class="scf-row">
      <label class="scf-label">Duration:</label>
      <label class="scf-duration-label">Min</label>
      <input type="number" class="scf-input scf-input-small" id="scf-min-duration" placeholder="min" min="0" step="0.5">
      <label class="scf-duration-label">Max</label>
      <input type="number" class="scf-input scf-input-small" id="scf-max-duration" placeholder="min" min="0" step="0.5">
      <span class="scf-hint">(minutes)</span>
    </div>
    <div class="scf-actions">
      <button type="button" class="scf-btn scf-btn-primary" id="scf-apply">Apply</button>
      <button type="button" class="scf-btn scf-btn-primary" id="scf-apply-reload">Apply &amp; Reload</button>
      <button type="button" class="scf-btn scf-btn-secondary" id="scf-mode-toggle">Extended Mode</button>
      <button type="button" class="scf-btn scf-btn-secondary" id="scf-clear">Clear</button>
      <button type="button" class="scf-btn scf-btn-help" id="scf-help" aria-label="Help">?</button>
    </div>
  `;

  return bar;
}

function readFiltersFromUI(bar: HTMLElement): FilterState {
  // Activity types
  const activityCheckboxes = bar.querySelectorAll<HTMLInputElement>("input[data-activity]");
  const activityTypes = Array.from(activityCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.dataset["activity"] as SCActivityType);

  // Search operator
  const activeBtn = bar.querySelector<HTMLElement>(".scf-pill-btn.scf-pill-active");
  const searchOperator = (activeBtn?.dataset["op"] === "or" ? "or" : "and") as FilterState["searchOperator"];

  // Search mode
  const isExtended = bar.querySelector<HTMLElement>(".scf-search-extended")!.style.display !== "none";
  const searchMode: FilterState["searchMode"] = isExtended ? "extended" : "simple";

  // Search values
  const searchString = bar.querySelector<HTMLInputElement>("#scf-search")?.value ?? "";
  const searchTitle = bar.querySelector<HTMLInputElement>("#scf-search-title")?.value ?? "";
  const searchDescription = bar.querySelector<HTMLInputElement>("#scf-search-desc")?.value ?? "";
  const searchGenre = bar.querySelector<HTMLInputElement>("#scf-search-genre")?.value ?? "";
  const searchArtist = bar.querySelector<HTMLInputElement>("#scf-search-artist")?.value ?? "";
  const searchLabel = bar.querySelector<HTMLInputElement>("#scf-search-label")?.value ?? "";

  // Duration (UI is in minutes, store in seconds)
  const minRaw = bar.querySelector<HTMLInputElement>("#scf-min-duration")?.value;
  const maxRaw = bar.querySelector<HTMLInputElement>("#scf-max-duration")?.value;
  const minDurationSeconds = minRaw ? parseFloat(minRaw) * 60 : null;
  const maxDurationSeconds = maxRaw ? parseFloat(maxRaw) * 60 : null;

  return {
    activityTypes,
    searchMode,
    searchString,
    searchTitle,
    searchDescription,
    searchGenre,
    searchArtist,
    searchLabel,
    searchOperator,
    minDurationSeconds,
    maxDurationSeconds,
  };
}

function applyFiltersFromUI(bar: HTMLElement): void {
  const filters = readFiltersFromUI(bar);
  sendFilters(filters);
  storage.save(filters);
}

function restoreFiltersToUI(bar: HTMLElement, filters: FilterState): void {

  // Activity type checkboxes
  const activityCheckboxes = bar.querySelectorAll<HTMLInputElement>("input[data-activity]");
  for (const cb of activityCheckboxes) {
    cb.checked = filters.activityTypes.includes(cb.dataset["activity"] as SCActivityType);
  }

  // Operator pill
  const pillBtns = bar.querySelectorAll<HTMLElement>(".scf-pill-btn");
  for (const btn of pillBtns) {
    btn.classList.toggle("scf-pill-active", btn.dataset["op"] === filters.searchOperator);
  }

  // Search mode
  const simpleContainer = bar.querySelector<HTMLElement>(".scf-search-simple")!;
  const extendedContainer = bar.querySelector<HTMLElement>(".scf-search-extended")!;
  const modeToggle = bar.querySelector<HTMLElement>("#scf-mode-toggle")!;
  if (filters.searchMode === "extended") {
    simpleContainer.style.display = "none";
    extendedContainer.style.display = "flex";
    modeToggle.textContent = "Simple Mode";
  } else {
    simpleContainer.style.display = "flex";
    extendedContainer.style.display = "none";
    modeToggle.textContent = "Extended Mode";
  }

  // Search values
  bar.querySelector<HTMLInputElement>("#scf-search")!.value = filters.searchString;
  bar.querySelector<HTMLInputElement>("#scf-search-title")!.value = filters.searchTitle;
  bar.querySelector<HTMLInputElement>("#scf-search-desc")!.value = filters.searchDescription;
  bar.querySelector<HTMLInputElement>("#scf-search-genre")!.value = filters.searchGenre;
  bar.querySelector<HTMLInputElement>("#scf-search-artist")!.value = filters.searchArtist;
  bar.querySelector<HTMLInputElement>("#scf-search-label")!.value = filters.searchLabel;

  // Duration (stored in seconds, display in minutes)
  bar.querySelector<HTMLInputElement>("#scf-min-duration")!.value =
    filters.minDurationSeconds != null ? String(filters.minDurationSeconds / 60) : "";
  bar.querySelector<HTMLInputElement>("#scf-max-duration")!.value =
    filters.maxDurationSeconds != null ? String(filters.maxDurationSeconds / 60) : "";
}

function wireUpInteractions(bar: HTMLElement): void {
  // Mode toggle (UI-only, doesn't apply filters)
  const modeToggle = bar.querySelector<HTMLElement>("#scf-mode-toggle")!;
  modeToggle.addEventListener("click", () => {
    const simpleContainer = bar.querySelector<HTMLElement>(".scf-search-simple")!;
    const extendedContainer = bar.querySelector<HTMLElement>(".scf-search-extended")!;
    const isSimple = simpleContainer.style.display !== "none";
    simpleContainer.style.display = isSimple ? "none" : "flex";
    extendedContainer.style.display = isSimple ? "flex" : "none";
    modeToggle.textContent = isSimple ? "Simple Mode" : "Extended Mode";
  });

  // Operator pill toggle (UI-only, doesn't apply filters)
  const pillBtns = bar.querySelectorAll<HTMLElement>(".scf-pill-btn");
  for (const btn of pillBtns) {
    btn.addEventListener("click", () => {
      for (const b of pillBtns) b.classList.remove("scf-pill-active");
      btn.classList.add("scf-pill-active");
    });
  }

  // Apply: persist + send to injected script
  bar.querySelector<HTMLElement>("#scf-apply")!.addEventListener("click", () => {
    applyFiltersFromUI(bar);
  });

  // Apply & Reload: persist + reload page so first XHR uses new filters
  bar.querySelector<HTMLElement>("#scf-apply-reload")!.addEventListener("click", () => {
    applyFiltersFromUI(bar);
    location.reload();
  });

  // Clear: reset UI to defaults
  bar.querySelector<HTMLElement>("#scf-clear")!.addEventListener("click", () => {
    restoreFiltersToUI(bar, DEFAULT_FILTERS);
  });

  // Help modal
  bar.querySelector<HTMLElement>("#scf-help")!.addEventListener("click", () => {
    openHelpModal();
  });
}

function injectFilterUI(): boolean {
  if (document.getElementById(FILTER_BAR_ID)) {
    log.debug("Filter bar already injected, skipping");
    return true;
  }

  const streamList = document.querySelector(".stream__list");
  const streamWild = document.querySelector('[class*="stream"]');
  const main = document.querySelector("main");
  const feedContainer = streamList ?? streamWild ?? main;

  if (!feedContainer) {
    log.debug("Feed container not found (stream__list: {sl}, [class*=stream]: {sw}, main: {m})", {
      sl: !!streamList,
      sw: !!streamWild,
      m: !!main,
    });
    return false;
  }

  log.debug("Feed container found: {tag}.{cls}", { tag: feedContainer.tagName, cls: feedContainer.className });

  const bar = createFilterBar();
  feedContainer.parentElement?.insertBefore(bar, feedContainer);
  log.debug("Filter bar injected into DOM");

  storage.load().then((filters) => {
    restoreFiltersToUI(bar, filters);
  });
  wireUpInteractions(bar);
  return true;
}

// SPA-aware injection
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    log.debug("MutationObserver fired, pathname: {path}", { path: location.pathname });
    if (location.pathname === "/" || location.pathname.includes("/feed")) {
      injectFilterUI();
    } else {
      log.debug("Not on feed page, skipping injection");
    }
  }, 200);
});

if (document.body) {
  log.debug("document.body available at script init, observing immediately");
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  log.debug("document.body not available, deferring observer to DOMContentLoaded");
  document.addEventListener("DOMContentLoaded", () => {
    log.debug("DOMContentLoaded fired, starting observer");
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
