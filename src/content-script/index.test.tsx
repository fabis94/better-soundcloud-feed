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
const mockUpdate = vi.fn();
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
  filterStore: {
    update: (...args: unknown[]) => mockUpdate(...args),
    get: () => ({ ...defaultFilters }),
    isAvailable: () => true,
  },
}));

// Mock player-controls to avoid side effects
vi.mock("./player-controls", () => ({
  injectPlayerControls: vi.fn(() => false),
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
const { injectFilterUI } = await import("./index");

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = "";
});

function createFeedContainer(): HTMLElement {
  const parent = document.createElement("div");
  const stream = document.createElement("div");
  stream.className = "stream__list";
  parent.appendChild(stream);
  document.body.appendChild(parent);
  return parent;
}

describe("injectFilterUI", () => {
  it("inserts filter bar before the feed container", () => {
    const parent = createFeedContainer();

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
    createFeedContainer();

    injectFilterUI();
    injectFilterUI();
    expect(document.querySelectorAll("#sc-feed-filter-bar").length).toBe(1);
  });

  it("renders filter bar with all action buttons", () => {
    createFeedContainer();
    injectFilterUI();

    const bar = document.getElementById("sc-feed-filter-bar")!;
    expect(bar.querySelector("#scf-apply")).not.toBeNull();
    expect(bar.querySelector("#scf-apply-reload")).not.toBeNull();
    expect(bar.querySelector("#scf-clear")).not.toBeNull();
    expect(bar.querySelector("#scf-help")).not.toBeNull();
  });
});
