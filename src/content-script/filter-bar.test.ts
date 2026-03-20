// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "@voidzero-dev/vite-plus-test";
import { SCActivityType } from "../shared/types";
import { DEFAULT_FILTERS } from "../shared/storage";
import {
  formatActivityType,
  createFilterBar,
  readFiltersFromUI,
  restoreFiltersToUI,
  wireUpInteractions,
  isFeedPage,
  FILTER_BAR_ID,
} from "./filter-bar";

afterEach(() => {
  document.body.innerHTML = "";
});

// --- formatActivityType ---

describe("formatActivityType", () => {
  it("converts TrackPost to Track post", () => {
    expect(formatActivityType("TrackPost")).toBe("Track post");
  });

  it("converts TrackRepost to Track repost", () => {
    expect(formatActivityType("TrackRepost")).toBe("Track repost");
  });

  it("converts PlaylistPost to Playlist post", () => {
    expect(formatActivityType("PlaylistPost")).toBe("Playlist post");
  });
});

// --- createFilterBar ---

describe("createFilterBar", () => {
  it("returns a div with the correct id", () => {
    const bar = createFilterBar();
    expect(bar.tagName).toBe("DIV");
    expect(bar.id).toBe(FILTER_BAR_ID);
  });

  it("contains checkboxes for all activity types", () => {
    const bar = createFilterBar();
    const checkboxes = bar.querySelectorAll<HTMLInputElement>("input[data-activity]");
    const values = Array.from(checkboxes).map((cb) => cb.dataset["activity"]);
    expect(values).toEqual(Object.values(SCActivityType));
  });

  it("contains search input and extended search fields", () => {
    const bar = createFilterBar();
    expect(bar.querySelector("#scf-search")).not.toBeNull();
    expect(bar.querySelector("#scf-search-title")).not.toBeNull();
    expect(bar.querySelector("#scf-search-desc")).not.toBeNull();
    expect(bar.querySelector("#scf-search-genre")).not.toBeNull();
    expect(bar.querySelector("#scf-search-artist")).not.toBeNull();
    expect(bar.querySelector("#scf-search-label")).not.toBeNull();
  });

  it("contains duration inputs", () => {
    const bar = createFilterBar();
    expect(bar.querySelector("#scf-min-duration")).not.toBeNull();
    expect(bar.querySelector("#scf-max-duration")).not.toBeNull();
  });

  it("contains all action buttons", () => {
    const bar = createFilterBar();
    expect(bar.querySelector("#scf-apply")).not.toBeNull();
    expect(bar.querySelector("#scf-apply-reload")).not.toBeNull();
    expect(bar.querySelector("#scf-mode-toggle")).not.toBeNull();
    expect(bar.querySelector("#scf-clear")).not.toBeNull();
    expect(bar.querySelector("#scf-help")).not.toBeNull();
  });
});

// --- readFiltersFromUI ---

describe("readFiltersFromUI", () => {
  it("reads all checked checkboxes as activity types", () => {
    const bar = createFilterBar();
    const filters = readFiltersFromUI(bar);
    expect(filters.activityTypes).toEqual(Object.values(SCActivityType));
  });

  it("excludes unchecked activity types", () => {
    const bar = createFilterBar();
    const trackPostCb = bar.querySelector<HTMLInputElement>('input[data-activity="TrackPost"]')!;
    trackPostCb.checked = false;
    const filters = readFiltersFromUI(bar);
    expect(filters.activityTypes).not.toContain("TrackPost");
    expect(filters.activityTypes).toContain("TrackRepost");
  });

  it("reads operator from active pill button", () => {
    const bar = createFilterBar();
    // Default is "and"
    expect(readFiltersFromUI(bar).searchOperator).toBe("and");

    // Switch to "or"
    const andBtn = bar.querySelector<HTMLElement>('.scf-pill-btn[data-op="and"]')!;
    const orBtn = bar.querySelector<HTMLElement>('.scf-pill-btn[data-op="or"]')!;
    andBtn.classList.remove("scf-pill-active");
    orBtn.classList.add("scf-pill-active");
    expect(readFiltersFromUI(bar).searchOperator).toBe("or");
  });

  it("reads simple mode by default", () => {
    const bar = createFilterBar();
    expect(readFiltersFromUI(bar).searchMode).toBe("simple");
  });

  it("reads extended mode when extended container is visible", () => {
    const bar = createFilterBar();
    bar.querySelector<HTMLElement>(".scf-search-extended")!.style.display = "flex";
    expect(readFiltersFromUI(bar).searchMode).toBe("extended");
  });

  it("reads search input values", () => {
    const bar = createFilterBar();
    bar.querySelector<HTMLInputElement>("#scf-search")!.value = "garage, house";
    bar.querySelector<HTMLInputElement>("#scf-search-title")!.value = "my title";
    const filters = readFiltersFromUI(bar);
    expect(filters.searchString).toBe("garage, house");
    expect(filters.searchTitle).toBe("my title");
  });

  it("reads duration values and converts minutes to seconds", () => {
    const bar = createFilterBar();
    bar.querySelector<HTMLInputElement>("#scf-min-duration")!.value = "2";
    bar.querySelector<HTMLInputElement>("#scf-max-duration")!.value = "10";
    const filters = readFiltersFromUI(bar);
    expect(filters.minDurationSeconds).toBe(120);
    expect(filters.maxDurationSeconds).toBe(600);
  });

  it("returns null for empty duration fields", () => {
    const bar = createFilterBar();
    const filters = readFiltersFromUI(bar);
    expect(filters.minDurationSeconds).toBeNull();
    expect(filters.maxDurationSeconds).toBeNull();
  });
});

// --- restoreFiltersToUI ---

describe("restoreFiltersToUI", () => {
  it("unchecks activity types not in the filter", () => {
    const bar = createFilterBar();
    restoreFiltersToUI(bar, { ...DEFAULT_FILTERS, activityTypes: ["TrackPost"] });
    const checkboxes = bar.querySelectorAll<HTMLInputElement>("input[data-activity]");
    for (const cb of checkboxes) {
      expect(cb.checked).toBe(cb.dataset["activity"] === "TrackPost");
    }
  });

  it("sets correct operator pill as active", () => {
    const bar = createFilterBar();
    restoreFiltersToUI(bar, { ...DEFAULT_FILTERS, searchOperator: "or" });
    const orBtn = bar.querySelector<HTMLElement>('.scf-pill-btn[data-op="or"]')!;
    const andBtn = bar.querySelector<HTMLElement>('.scf-pill-btn[data-op="and"]')!;
    expect(orBtn.classList.contains("scf-pill-active")).toBe(true);
    expect(andBtn.classList.contains("scf-pill-active")).toBe(false);
  });

  it("shows extended mode when searchMode is extended", () => {
    const bar = createFilterBar();
    restoreFiltersToUI(bar, { ...DEFAULT_FILTERS, searchMode: "extended" });
    expect(bar.querySelector<HTMLElement>(".scf-search-simple")!.style.display).toBe("none");
    expect(bar.querySelector<HTMLElement>(".scf-search-extended")!.style.display).toBe("flex");
    expect(bar.querySelector<HTMLElement>("#scf-mode-toggle")!.textContent).toBe("Simple Mode");
  });

  it("shows simple mode when searchMode is simple", () => {
    const bar = createFilterBar();
    // First set to extended, then back to simple
    restoreFiltersToUI(bar, { ...DEFAULT_FILTERS, searchMode: "extended" });
    restoreFiltersToUI(bar, { ...DEFAULT_FILTERS, searchMode: "simple" });
    expect(bar.querySelector<HTMLElement>(".scf-search-simple")!.style.display).toBe("flex");
    expect(bar.querySelector<HTMLElement>(".scf-search-extended")!.style.display).toBe("none");
    expect(bar.querySelector<HTMLElement>("#scf-mode-toggle")!.textContent).toBe("Extended Mode");
  });

  it("populates search values", () => {
    const bar = createFilterBar();
    restoreFiltersToUI(bar, {
      ...DEFAULT_FILTERS,
      searchString: "test query",
      searchTitle: "my title",
      searchGenre: "house",
    });
    expect(bar.querySelector<HTMLInputElement>("#scf-search")!.value).toBe("test query");
    expect(bar.querySelector<HTMLInputElement>("#scf-search-title")!.value).toBe("my title");
    expect(bar.querySelector<HTMLInputElement>("#scf-search-genre")!.value).toBe("house");
  });

  it("converts duration seconds to minutes", () => {
    const bar = createFilterBar();
    restoreFiltersToUI(bar, { ...DEFAULT_FILTERS, minDurationSeconds: 120, maxDurationSeconds: 600 });
    expect(bar.querySelector<HTMLInputElement>("#scf-min-duration")!.value).toBe("2");
    expect(bar.querySelector<HTMLInputElement>("#scf-max-duration")!.value).toBe("10");
  });
});

// --- round-trip ---

describe("readFiltersFromUI / restoreFiltersToUI round-trip", () => {
  it("round-trips default filters", () => {
    const bar = createFilterBar();
    restoreFiltersToUI(bar, DEFAULT_FILTERS);
    const result = readFiltersFromUI(bar);
    expect(result).toEqual(DEFAULT_FILTERS);
  });

  it("round-trips extended mode with partial fields", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      searchMode: "extended" as const,
      searchTitle: "garage",
      searchArtist: "dj shadow",
      searchOperator: "or" as const,
      minDurationSeconds: 180,
      maxDurationSeconds: null,
    };
    const bar = createFilterBar();
    restoreFiltersToUI(bar, filters);
    const result = readFiltersFromUI(bar);
    expect(result).toEqual(filters);
  });
});

// --- wireUpInteractions ---

describe("wireUpInteractions", () => {
  function setupBar() {
    const bar = createFilterBar();
    const deps = {
      onApply: vi.fn(),
      onApplyReload: vi.fn(),
      onClear: vi.fn(),
      onHelp: vi.fn(),
    };
    wireUpInteractions(bar, deps);
    return { bar, deps };
  }

  it("mode toggle switches simple to extended", () => {
    const { bar } = setupBar();
    bar.querySelector<HTMLElement>("#scf-mode-toggle")!.click();
    expect(bar.querySelector<HTMLElement>(".scf-search-simple")!.style.display).toBe("none");
    expect(bar.querySelector<HTMLElement>(".scf-search-extended")!.style.display).toBe("flex");
  });

  it("mode toggle updates button text", () => {
    const { bar } = setupBar();
    const toggle = bar.querySelector<HTMLElement>("#scf-mode-toggle")!;
    toggle.click();
    expect(toggle.textContent).toBe("Simple Mode");
    toggle.click();
    expect(toggle.textContent).toBe("Extended Mode");
  });

  it("operator pill toggles active class", () => {
    const { bar } = setupBar();
    const orBtn = bar.querySelector<HTMLElement>('.scf-pill-btn[data-op="or"]')!;
    const andBtn = bar.querySelector<HTMLElement>('.scf-pill-btn[data-op="and"]')!;
    orBtn.click();
    expect(orBtn.classList.contains("scf-pill-active")).toBe(true);
    expect(andBtn.classList.contains("scf-pill-active")).toBe(false);
  });

  it("apply button calls onApply", () => {
    const { bar, deps } = setupBar();
    bar.querySelector<HTMLElement>("#scf-apply")!.click();
    expect(deps.onApply).toHaveBeenCalledWith(bar);
  });

  it("apply & reload button calls onApplyReload", () => {
    const { bar, deps } = setupBar();
    bar.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(deps.onApplyReload).toHaveBeenCalledWith(bar);
  });

  it("clear button calls onClear", () => {
    const { bar, deps } = setupBar();
    bar.querySelector<HTMLElement>("#scf-clear")!.click();
    expect(deps.onClear).toHaveBeenCalledWith(bar);
  });

  it("help button calls onHelp", () => {
    const { bar, deps } = setupBar();
    bar.querySelector<HTMLElement>("#scf-help")!.click();
    expect(deps.onHelp).toHaveBeenCalled();
  });
});

// --- isFeedPage ---

describe("isFeedPage", () => {
  function setPathname(path: string) {
    Object.defineProperty(window, "location", {
      value: { ...window.location, pathname: path },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    setPathname("/");
  });

  it("returns true for /", () => {
    setPathname("/");
    expect(isFeedPage()).toBe(true);
  });

  it("returns true for /feed", () => {
    setPathname("/feed");
    expect(isFeedPage()).toBe(true);
  });

  it("returns true for /discover/feed", () => {
    setPathname("/discover/feed");
    expect(isFeedPage()).toBe(true);
  });

  it("returns false for /you/likes", () => {
    setPathname("/you/likes");
    expect(isFeedPage()).toBe(false);
  });
});
