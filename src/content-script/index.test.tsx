// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";
import { PageKind } from "../shared/pages";

// Mock logger before any imports that use it
vi.mock("../shared/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock storage: one store per page family so tests can tell them apart
const defaultFilters = {
  activityTypes: ["TrackPost", "TrackRepost", "PlaylistPost"],
  searchMode: "simple",
  searchString: "",
  searchFields: ["title", "description", "genre", "artist", "label"],
  searchTitle: "",
  searchDescription: "",
  searchGenre: "",
  searchArtist: "",
  searchLabel: "",
  searchOperator: "and",
  minDurationSeconds: null,
  maxDurationSeconds: null,
  createdFrom: null,
  createdTo: null,
  minLikes: null,
  maxLikes: null,
  minPlays: null,
  maxPlays: null,
  minFollowers: null,
  maxFollowers: null,
};
const feedStore = {
  update: vi.fn(),
  get: () => ({ ...defaultFilters }),
  isAvailable: () => true,
};
const tagStore = {
  update: vi.fn(),
  get: () => ({ ...defaultFilters, searchString: "tag state" }),
  isAvailable: () => true,
};

vi.mock("../shared/stores/filter-store", () => ({
  DEFAULT_FILTERS: defaultFilters,
  filterStore: feedStore,
  tagFilterStore: tagStore,
  getFilterStore: (kind: string) => (kind === "feed" ? feedStore : tagStore),
}));

// Mock the UI preference store
const uiUpdate = vi.fn();
vi.mock("../shared/stores/ui-store", () => ({
  uiStore: {
    get: (key?: string) => (key === "advancedFiltersOpen" ? true : { advancedFiltersOpen: true }),
    update: (...args: unknown[]) => uiUpdate(...args),
  },
}));

// Mock player-controls to avoid side effects
vi.mock("./player-controls", () => ({
  injectPlayerControls: vi.fn(() => false),
}));

// Must import after mocks are set up
const { injectFilterUI, syncFilterUI } = await import("./index");

const reloadSpy = vi.fn();

function setLocation(pathname: string): void {
  Object.defineProperty(window, "location", {
    value: { pathname, reload: reloadSpy },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  setLocation("/");
});

afterEach(() => {
  document.body.innerHTML = "";
});

const BAR_ID = "sc-feed-filter-bar";
const bar = () => document.getElementById(BAR_ID);

function createFeedContainer(): HTMLElement {
  const parent = document.createElement("div");
  const stream = document.createElement("div");
  stream.className = "stream__list";
  parent.appendChild(stream);
  document.body.appendChild(parent);
  return parent;
}

/** `.tagsMain > .tabs > .tabs__content > .tabs__contentSlot`, as on SC's tag pages. */
function createTagContainer(): { content: HTMLElement; slot: HTMLElement } {
  const main = document.createElement("div");
  main.className = "tagsMain";
  const tabs = document.createElement("div");
  tabs.className = "tabs";
  const content = document.createElement("div");
  content.className = "tabs__content";
  const slot = document.createElement("div");
  slot.className = "tabs__contentSlot";
  content.appendChild(slot);
  tabs.appendChild(content);
  main.appendChild(tabs);
  document.body.appendChild(main);
  return { content, slot };
}

describe("injectFilterUI on the feed", () => {
  it("inserts filter bar before the feed container", () => {
    const parent = createFeedContainer();

    const result = injectFilterUI(PageKind.Feed);
    expect(result).toBe(true);
    expect(bar()).not.toBeNull();
    // Bar should be before stream in the parent
    expect(parent.firstElementChild!.id).toBe(BAR_ID);
    expect(bar()!.dataset["storeKey"]).toBe("bscf_filters");
  });

  it("returns false when no feed container exists", () => {
    const result = injectFilterUI(PageKind.Feed);
    expect(result).toBe(false);
    expect(bar()).toBeNull();
  });

  it("does not duplicate the bar on repeated calls", () => {
    createFeedContainer();

    injectFilterUI(PageKind.Feed);
    injectFilterUI(PageKind.Feed);
    expect(document.querySelectorAll(`#${BAR_ID}`).length).toBe(1);
  });

  it("renders filter bar with the action buttons and the activity row", () => {
    createFeedContainer();
    injectFilterUI(PageKind.Feed);

    const el = bar()!;
    expect(el.querySelector("#scf-apply")).toBeNull();
    expect(el.querySelector("#scf-apply-reload")).not.toBeNull();
    expect(el.querySelector("#scf-clear")).not.toBeNull();
    expect(el.querySelector("#scf-help")).not.toBeNull();
    expect(el.querySelectorAll("input[data-activity]").length).toBeGreaterThan(0);
  });

  it("restores the accordion state and persists changes to it", () => {
    createFeedContainer();
    injectFilterUI(PageKind.Feed);

    const body = bar()!.querySelector<HTMLElement>("#scf-advanced-body")!;
    expect(body.style.display).toBe("flex");
    bar()!.querySelector<HTMLElement>("#scf-advanced-toggle")!.click();
    expect(uiUpdate).toHaveBeenCalledWith({ advancedFiltersOpen: false });
  });

  it("apply & reload writes to the feed store and reloads", () => {
    createFeedContainer();
    injectFilterUI(PageKind.Feed);

    bar()!.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(feedStore.update).toHaveBeenCalledTimes(1);
    expect(tagStore.update).not.toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});

describe("injectFilterUI on tag pages", () => {
  it("inserts the bar before the tab content slot", () => {
    const { content, slot } = createTagContainer();

    expect(injectFilterUI(PageKind.TagRecent)).toBe(true);
    expect(bar()!.parentElement).toBe(content);
    expect(bar()!.nextElementSibling).toBe(slot);
    expect(bar()!.dataset["storeKey"]).toBe("bscf_filters_tags");
  });

  it("returns false when the tag layout is not there yet", () => {
    createFeedContainer();
    expect(injectFilterUI(PageKind.TagPopular)).toBe(false);
    expect(bar()).toBeNull();
  });

  it("uses the tag variant: no activity row, upload-date label, tag state", () => {
    createTagContainer();
    injectFilterUI(PageKind.TagRecent);

    const el = bar()!;
    expect(el.querySelector("input[data-activity]")).toBeNull();
    const labels = Array.from(el.querySelectorAll(".scf-label")).map((l) => l.textContent);
    expect(labels).toContain("Uploaded:");
    expect(el.querySelector<HTMLInputElement>("#scf-search")!.value).toBe("tag state");
  });

  it("apply & reload writes to the tag store", () => {
    createTagContainer();
    injectFilterUI(PageKind.TagPopular);

    bar()!.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(tagStore.update).toHaveBeenCalledTimes(1);
    expect(feedStore.update).not.toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps the same bar for both tag tabs", () => {
    createTagContainer();
    injectFilterUI(PageKind.TagRecent);
    const first = bar();
    injectFilterUI(PageKind.TagPopular);
    expect(bar()).toBe(first);
    expect(document.querySelectorAll(`#${BAR_ID}`).length).toBe(1);
  });

  it("replaces a bar bound to the other store", () => {
    createFeedContainer();
    createTagContainer();
    injectFilterUI(PageKind.Feed);
    const feedBar = bar();

    expect(injectFilterUI(PageKind.TagRecent)).toBe(true);
    expect(bar()).not.toBe(feedBar);
    expect(bar()!.dataset["storeKey"]).toBe("bscf_filters_tags");
    expect(document.querySelectorAll(`#${BAR_ID}`).length).toBe(1);
  });
});

describe("syncFilterUI", () => {
  it("mounts on the feed and on both tag tabs", () => {
    createFeedContainer();
    syncFilterUI("/feed");
    expect(bar()!.dataset["storeKey"]).toBe("bscf_filters");

    document.body.innerHTML = "";
    createTagContainer();
    syncFilterUI("/tags/speed%20garage");
    expect(bar()!.dataset["storeKey"]).toBe("bscf_filters_tags");

    document.body.innerHTML = "";
    createTagContainer();
    syncFilterUI("/tags/speed%20garage/popular-tracks");
    expect(bar()!.dataset["storeKey"]).toBe("bscf_filters_tags");
  });

  it("keeps the bar node across Recent ↔ Popular navigation", () => {
    createTagContainer();
    syncFilterUI("/tags/x");
    const first = bar();
    syncFilterUI("/tags/x/popular-tracks");
    expect(bar()).toBe(first);
    syncFilterUI("/tags/x");
    expect(bar()).toBe(first);
  });

  it("removes the bar on the Playlists tab and brings it back afterwards", () => {
    const { content } = createTagContainer();
    syncFilterUI("/tags/x");
    expect(bar()).not.toBeNull();

    syncFilterUI("/tags/x/playlists");
    expect(bar()).toBeNull();
    expect(content.querySelector(".scf-row")).toBeNull();

    syncFilterUI("/tags/x/popular-tracks");
    expect(bar()).not.toBeNull();
  });

  it("removes the bar on unrelated pages", () => {
    createFeedContainer();
    syncFilterUI("/feed");
    expect(bar()).not.toBeNull();
    syncFilterUI("/discover");
    expect(bar()).toBeNull();
  });

  it("is a no-op on unrelated pages without a bar", () => {
    createFeedContainer();
    expect(() => syncFilterUI("/you/likes")).not.toThrow();
    expect(bar()).toBeNull();
  });
});
