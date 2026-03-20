import type { FilterState, FilterUpdateMessage } from "./types";
import { createChromeFilterStorage } from "./storage";

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

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function createFilterBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.id = FILTER_BAR_ID;

  bar.innerHTML = `
    <div class="scf-row">
      <label class="scf-label">Types:</label>
      <label class="scf-check"><input type="checkbox" data-type="track" checked> Tracks</label>
      <label class="scf-check"><input type="checkbox" data-type="track-repost" checked> Track Reposts</label>
      <label class="scf-check"><input type="checkbox" data-type="playlist" checked> Playlists</label>
      <label class="scf-check"><input type="checkbox" data-type="playlist-repost" checked> Playlist Reposts</label>
    </div>
    <div class="scf-row">
      <label class="scf-label">Exclude artists:</label>
      <input type="text" class="scf-input" id="scf-exclude-artists" placeholder="comma-separated permalinks">
    </div>
    <div class="scf-row">
      <label class="scf-label">Genres/tags:</label>
      <input type="text" class="scf-input" id="scf-genres" placeholder="comma-separated (whitelist, leave empty for all)">
    </div>
  `;

  return bar;
}

function readFiltersFromUI(bar: HTMLElement): FilterState {
  const checkboxes = bar.querySelectorAll<HTMLInputElement>("input[data-type]");
  const types: FilterState["types"] = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.dataset["type"] as FilterState["types"][number]);

  const excludeInput = bar.querySelector<HTMLInputElement>("#scf-exclude-artists")!;
  const genresInput = bar.querySelector<HTMLInputElement>("#scf-genres")!;

  return {
    types,
    excludeArtists: parseCommaSeparated(excludeInput.value),
    genres: parseCommaSeparated(genresInput.value),
  };
}

function applyFiltersFromUI(bar: HTMLElement): void {
  const filters = readFiltersFromUI(bar);
  sendFilters(filters);
  storage.save(filters);
}

async function restoreFiltersToUI(bar: HTMLElement): Promise<void> {
  const filters = await storage.load();

  // Restore type checkboxes
  const checkboxes = bar.querySelectorAll<HTMLInputElement>("input[data-type]");
  for (const cb of checkboxes) {
    cb.checked = filters.types.includes(cb.dataset["type"] as FilterState["types"][number]);
  }

  // Restore text inputs
  const excludeInput = bar.querySelector<HTMLInputElement>("#scf-exclude-artists")!;
  excludeInput.value = filters.excludeArtists.join(", ");

  const genresInput = bar.querySelector<HTMLInputElement>("#scf-genres")!;
  genresInput.value = filters.genres.join(", ");

  // Push initial filters to injected script
  sendFilters(filters);
}

function injectFilterUI(): void {
  if (document.getElementById(FILTER_BAR_ID)) return;

  // Find SC's feed container — try known selectors
  const feedContainer =
    document.querySelector(".stream__list") ??
    document.querySelector('[class*="stream"]') ??
    document.querySelector("main");

  if (!feedContainer) return;

  const bar = createFilterBar();
  feedContainer.parentElement?.insertBefore(bar, feedContainer);

  // Restore saved state and wire up change handlers
  restoreFiltersToUI(bar);

  bar.addEventListener("change", () => applyFiltersFromUI(bar));
  bar.addEventListener("input", () => applyFiltersFromUI(bar));
}

// SPA-aware injection: watch for route changes / DOM mutations
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (location.pathname === "/" || location.pathname.includes("/feed")) {
      injectFilterUI();
    }
  }, 200);
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
