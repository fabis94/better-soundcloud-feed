// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";

// Mock logger before any imports that use it
vi.mock("../shared/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock storage
const mockSave = vi.fn();
const defaultFilters = {
  activityTypes: ["TrackPost", "TrackRepost", "PlaylistPost"],
  searchMode: "simple",
  searchString: "",
  searchTitle: "",
  searchDescription: "",
  searchGenre: "",
  searchArtist: "",
  searchLabel: "",
  searchOperator: "and",
  minDurationSeconds: null,
  maxDurationSeconds: null,
};

vi.mock("../shared/storage", () => ({
  DEFAULT_FILTERS: defaultFilters,
  filterStorage: {
    save: (...args: unknown[]) => mockSave(...args),
    load: () => ({ ...defaultFilters }),
    isAvailable: () => true,
  },
}));

// Stub chrome.runtime and chrome.storage before importing the module
Object.defineProperty(globalThis, "chrome", {
  value: {
    runtime: { getURL: vi.fn((path: string) => `chrome-extension://fake/${path}`) },
    storage: { local: { get: vi.fn(), set: vi.fn() } },
  },
  configurable: true,
});

// Must import after mocks are set up
const { injectFilterUI, applyFiltersFromUI } = await import("./index");

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("injectFilterUI", () => {
  it("inserts filter bar before the feed container", () => {
    const parent = document.createElement("div");
    const stream = document.createElement("div");
    stream.className = "stream__list";
    parent.appendChild(stream);
    document.body.appendChild(parent);

    const result = injectFilterUI();
    expect(result).toBe(true);
    expect(document.getElementById("sc-feed-filter-bar")).not.toBeNull();
    // Bar should be before stream in the parent
    expect(parent.firstElementChild!.id).toBe("sc-feed-filter-bar");
  });

  it("returns false when no feed container exists", () => {
    const result = injectFilterUI();
    expect(result).toBe(false);
    expect(document.getElementById("sc-feed-filter-bar")).toBeNull();
  });

  it("does not duplicate the bar on repeated calls", () => {
    const parent = document.createElement("div");
    const stream = document.createElement("div");
    stream.className = "stream__list";
    parent.appendChild(stream);
    document.body.appendChild(parent);

    injectFilterUI();
    injectFilterUI();
    expect(document.querySelectorAll("#sc-feed-filter-bar").length).toBe(1);
  });
});

describe("applyFiltersFromUI", () => {
  it("sends postMessage with filter data", () => {
    const spy = vi.spyOn(window, "postMessage");
    // Create a bar in the DOM
    const parent = document.createElement("div");
    const stream = document.createElement("div");
    stream.className = "stream__list";
    parent.appendChild(stream);
    document.body.appendChild(parent);
    injectFilterUI();

    const bar = document.getElementById("sc-feed-filter-bar")!;
    applyFiltersFromUI(bar);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SC_FILTER_UPDATE", filters: expect.any(Object) }),
      "*",
    );
    spy.mockRestore();
  });

  it("saves filters to storage", () => {
    const parent = document.createElement("div");
    const stream = document.createElement("div");
    stream.className = "stream__list";
    parent.appendChild(stream);
    document.body.appendChild(parent);
    injectFilterUI();

    const bar = document.getElementById("sc-feed-filter-bar")!;
    applyFiltersFromUI(bar);

    expect(mockSave).toHaveBeenCalledWith(expect.any(Object));
  });
});
