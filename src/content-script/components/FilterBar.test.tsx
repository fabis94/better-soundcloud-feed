// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, type Mock } from "@voidzero-dev/vite-plus-test";
import { render } from "preact";
import { SCActivityType, SearchField } from "../../shared/types";
import { DEFAULT_FILTERS } from "../../shared/stores/filter-store";
import { PageKind, PAGE_CONFIGS } from "../../shared/pages";
import { REPO_URL, APP_NAME } from "../../shared/constants";
import { FilterBar } from "./FilterBar";

const FEED_UI = PAGE_CONFIGS[PageKind.Feed].ui;
const TAG_UI = PAGE_CONFIGS[PageKind.TagRecent].ui;

let container: HTMLDivElement;

interface SetupResult {
  initialFilters: Parameters<typeof FilterBar>[0]["initialFilters"];
  storageAvailable: boolean;
  onAdvancedOpenChange: Mock;
  onApplyReload: Mock;
  onHelp: Mock;
}

function setup(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}): SetupResult {
  const props = {
    initialFilters: { ...DEFAULT_FILTERS },
    storageAvailable: true,
    ui: FEED_UI,
    initialAdvancedOpen: false,
    onAdvancedOpenChange: vi.fn(),
    onApplyReload: vi.fn(),
    onHelp: vi.fn(),
    ...overrides,
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  render(<FilterBar {...props} />, container);
  return props as SetupResult;
}

afterEach(() => {
  if (container) render(null, container);
  document.body.innerHTML = "";
});

// --- render ---

describe("FilterBar render", () => {
  it("contains checkboxes for all activity types", () => {
    setup();
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[data-activity]");
    const values = Array.from(checkboxes).map((cb) => cb.getAttribute("data-activity"));
    expect(values).toEqual(Object.values(SCActivityType));
  });

  it("contains a checked checkbox for every search field, shown in simple mode", () => {
    setup();
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[data-search-field]");
    const values = Array.from(checkboxes).map((cb) => cb.getAttribute("data-search-field"));
    expect(values).toEqual(Object.values(SearchField));
    expect(Array.from(checkboxes).every((cb) => cb.checked)).toBe(true);
    expect(container.querySelector<HTMLElement>(".scf-search-fields")!.style.display).toBe("flex");
  });

  it("labels the search field checkboxes", () => {
    setup();
    const row = container.querySelector<HTMLElement>(".scf-search-fields")!;
    const labels = Array.from(row.querySelectorAll("label.scf-check")).map((l) =>
      l.textContent!.trim(),
    );
    expect(labels).toEqual(["Title", "Description", "Genre", "Artist", "Label"]);
    expect(row.textContent).toContain("Search in");
  });

  it("contains search input and extended search fields", () => {
    setup();
    expect(container.querySelector("#scf-search")).not.toBeNull();
    expect(container.querySelector("#scf-search-title")).not.toBeNull();
    expect(container.querySelector("#scf-search-desc")).not.toBeNull();
    expect(container.querySelector("#scf-search-genre")).not.toBeNull();
    expect(container.querySelector("#scf-search-artist")).not.toBeNull();
    expect(container.querySelector("#scf-search-label")).not.toBeNull();
  });

  it("contains duration inputs", () => {
    setup();
    expect(container.querySelector("#scf-min-duration")).not.toBeNull();
    expect(container.querySelector("#scf-max-duration")).not.toBeNull();
  });

  it("contains all action buttons", () => {
    setup();
    expect(container.querySelector("#scf-apply-reload")).not.toBeNull();
    expect(container.querySelector("#scf-apply-reload")).not.toBeNull();
    expect(container.querySelector("#scf-mode-toggle")).not.toBeNull();
    expect(container.querySelector("#scf-clear")).not.toBeNull();
    expect(container.querySelector("#scf-help")).not.toBeNull();
  });

  it("disables Apply & Reload when storage unavailable", () => {
    setup({ storageAvailable: false });
    expect(container.querySelector<HTMLButtonElement>("#scf-apply-reload")!.disabled).toBe(true);
  });
});

// --- apply reads correct state ---

describe("apply reads filters", () => {
  it("reads all checked checkboxes as activity types", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].activityTypes).toEqual(
      Object.values(SCActivityType),
    );
  });

  it("excludes unchecked activity types", async () => {
    const props = setup();
    const cb = container.querySelector<HTMLInputElement>('input[data-activity="TrackPost"]')!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.activityTypes).not.toContain("TrackPost");
    expect(filters.activityTypes).toContain("TrackRepost");
  });

  it("reads all search fields by default", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchFields).toEqual(Object.values(SearchField));
  });

  it("excludes unchecked search fields", async () => {
    const props = setup();
    const cb = container.querySelector<HTMLInputElement>('input[data-search-field="description"]')!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.searchFields).not.toContain("description");
    expect(filters.searchFields).toEqual(["title", "genre", "artist", "label"]);
  });

  it("re-checking a search field adds it back", async () => {
    const props = setup({
      initialFilters: { ...DEFAULT_FILTERS, searchFields: [SearchField.Title] },
    });
    const cb = container.querySelector<HTMLInputElement>('input[data-search-field="genre"]')!;
    cb.checked = true;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchFields).toEqual(["title", "genre"]);
  });

  it("allows unchecking every search field", async () => {
    const props = setup({
      initialFilters: { ...DEFAULT_FILTERS, searchFields: [SearchField.Title] },
    });
    const cb = container.querySelector<HTMLInputElement>('input[data-search-field="title"]')!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchFields).toEqual([]);
  });

  it("does not apply when a search field is toggled (explicit apply)", async () => {
    const props = setup();
    const cb = container.querySelector<HTMLInputElement>('input[data-search-field="label"]')!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(props.onApplyReload).not.toHaveBeenCalled();
  });

  it("reads operator from active pill button", async () => {
    const props = setup();
    container.querySelector<HTMLElement>('.scf-pill-btn[data-op="or"]')!.click();
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchOperator).toBe("or");
  });

  it("reads simple mode by default", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchMode).toBe("simple");
  });

  it("reads extended mode when toggled", async () => {
    const props = setup();
    container.querySelector<HTMLElement>('.scf-pill-btn[data-mode="extended"]')!.click();
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchMode).toBe("extended");
  });

  it("reads search input values", async () => {
    const props = setup();
    const searchInput = container.querySelector<HTMLInputElement>("#scf-search")!;
    searchInput.value = "garage, house";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchString).toBe("garage, house");
  });

  it("reads duration values and converts minutes to seconds", async () => {
    const props = setup();
    const minInput = container.querySelector<HTMLInputElement>("#scf-min-duration")!;
    minInput.value = "2";
    minInput.dispatchEvent(new Event("input", { bubbles: true }));

    const maxInput = container.querySelector<HTMLInputElement>("#scf-max-duration")!;
    maxInput.value = "10";
    maxInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.minDurationSeconds).toBe(120);
    expect(filters.maxDurationSeconds).toBe(600);
  });

  it("returns null for empty duration fields", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.minDurationSeconds).toBeNull();
    expect(filters.maxDurationSeconds).toBeNull();
  });
});

// --- initial state restoration ---

describe("initial state", () => {
  it("unchecks activity types not in initial filters", () => {
    setup({ initialFilters: { ...DEFAULT_FILTERS, activityTypes: ["TrackPost"] } });
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[data-activity]");
    for (const cb of checkboxes) {
      expect(cb.checked).toBe(cb.getAttribute("data-activity") === "TrackPost");
    }
  });

  it("unchecks search fields not in initial filters", () => {
    setup({
      initialFilters: {
        ...DEFAULT_FILTERS,
        searchFields: [SearchField.Title, SearchField.Genre],
      },
    });
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[data-search-field]");
    for (const cb of checkboxes) {
      const field = cb.getAttribute("data-search-field");
      expect(cb.checked).toBe(field === "title" || field === "genre");
    }
  });

  it("sets correct operator pill as active", () => {
    setup({ initialFilters: { ...DEFAULT_FILTERS, searchOperator: "or" } });
    const orBtn = container.querySelector<HTMLElement>('.scf-pill-btn[data-op="or"]')!;
    const andBtn = container.querySelector<HTMLElement>('.scf-pill-btn[data-op="and"]')!;
    expect(orBtn.classList.contains("scf-pill-active")).toBe(true);
    expect(andBtn.classList.contains("scf-pill-active")).toBe(false);
  });

  it("shows extended mode when searchMode is extended", () => {
    setup({ initialFilters: { ...DEFAULT_FILTERS, searchMode: "extended" } });
    expect(container.querySelector<HTMLElement>(".scf-search-simple")!.style.display).toBe("none");
    expect(container.querySelector<HTMLElement>(".scf-search-extended")!.style.display).toBe(
      "flex",
    );
    expect(container.querySelector<HTMLElement>(".scf-search-fields")!.style.display).toBe("none");
    expect(
      container
        .querySelector<HTMLElement>('.scf-pill-btn[data-mode="extended"]')!
        .classList.contains("scf-pill-active"),
    ).toBe(true);
    expect(
      container
        .querySelector<HTMLElement>('.scf-pill-btn[data-mode="simple"]')!
        .classList.contains("scf-pill-active"),
    ).toBe(false);
  });

  it("populates search values", () => {
    setup({
      initialFilters: {
        ...DEFAULT_FILTERS,
        searchString: "test query",
        searchTitle: "my title",
        searchGenre: "house",
      },
    });
    expect(container.querySelector<HTMLInputElement>("#scf-search")!.value).toBe("test query");
    expect(container.querySelector<HTMLInputElement>("#scf-search-title")!.value).toBe("my title");
    expect(container.querySelector<HTMLInputElement>("#scf-search-genre")!.value).toBe("house");
  });

  it("converts duration seconds to minutes", () => {
    setup({
      initialFilters: { ...DEFAULT_FILTERS, minDurationSeconds: 120, maxDurationSeconds: 600 },
    });
    expect(container.querySelector<HTMLInputElement>("#scf-min-duration")!.value).toBe("2");
    expect(container.querySelector<HTMLInputElement>("#scf-max-duration")!.value).toBe("10");
  });
});

// --- interactions ---

describe("interactions", () => {
  it("mode pill switches simple to extended", async () => {
    setup();
    container.querySelector<HTMLElement>('.scf-pill-btn[data-mode="extended"]')!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector<HTMLElement>(".scf-search-simple")!.style.display).toBe("none");
    expect(container.querySelector<HTMLElement>(".scf-search-extended")!.style.display).toBe(
      "flex",
    );
  });

  it("mode pill hides the search field checkboxes and keeps their state", async () => {
    const props = setup();
    const cb = container.querySelector<HTMLInputElement>('input[data-search-field="description"]')!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    const extended = container.querySelector<HTMLElement>('.scf-pill-btn[data-mode="extended"]')!;
    const simple = container.querySelector<HTMLElement>('.scf-pill-btn[data-mode="simple"]')!;
    extended.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector<HTMLElement>(".scf-search-fields")!.style.display).toBe("none");

    simple.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector<HTMLElement>(".scf-search-fields")!.style.display).toBe("flex");

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchFields).not.toContain("description");
  });

  it("mode pill marks the active mode and sits in the search row", async () => {
    setup();
    const pill = container.querySelector<HTMLElement>("#scf-mode-toggle")!;
    expect(pill.closest(".scf-row")!.querySelector("#scf-search")).not.toBeNull();
    expect(container.querySelector(".scf-actions #scf-mode-toggle")).toBeNull();

    const extended = pill.querySelector<HTMLElement>('[data-mode="extended"]')!;
    const simple = pill.querySelector<HTMLElement>('[data-mode="simple"]')!;
    expect(simple.classList.contains("scf-pill-active")).toBe(true);
    extended.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(extended.classList.contains("scf-pill-active")).toBe(true);
    expect(simple.classList.contains("scf-pill-active")).toBe(false);
    simple.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(simple.classList.contains("scf-pill-active")).toBe(true);
  });

  it("operator pill toggles active class", async () => {
    setup();
    const orBtn = container.querySelector<HTMLElement>('.scf-pill-btn[data-op="or"]')!;
    const andBtn = container.querySelector<HTMLElement>('.scf-pill-btn[data-op="and"]')!;
    orBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(orBtn.classList.contains("scf-pill-active")).toBe(true);
    expect(andBtn.classList.contains("scf-pill-active")).toBe(false);
  });

  it("has no plain apply button", () => {
    setup();
    expect(container.querySelector("#scf-apply")).toBeNull();
    expect(container.querySelector("#scf-mode-toggle .scf-pill-btn")).not.toBeNull();
  });

  it("apply & reload button calls onApplyReload", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload).toHaveBeenCalledTimes(1);
  });

  it("clear button resets filters to defaults", async () => {
    const props = setup({
      initialFilters: { ...DEFAULT_FILTERS, searchString: "test", searchOperator: "or" },
    });
    container.querySelector<HTMLElement>("#scf-clear")!.click();
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.searchString).toBe("");
    expect(filters.searchOperator).toBe("and");
  });

  it("clear button re-checks all search fields", async () => {
    const props = setup({
      initialFilters: { ...DEFAULT_FILTERS, searchFields: [SearchField.Title] },
    });
    container.querySelector<HTMLElement>("#scf-clear")!.click();
    await new Promise((r) => setTimeout(r, 0));

    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[data-search-field]");
    expect(Array.from(checkboxes).every((cb) => cb.checked)).toBe(true);

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    expect(props.onApplyReload.mock.calls[0]![0].searchFields).toEqual(Object.values(SearchField));
  });

  it("help button calls onHelp", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-help")!.click();
    expect(props.onHelp).toHaveBeenCalledTimes(1);
  });
});

// --- page variants ---

describe("page ui variants", () => {
  it("hides the activity row on tag pages", () => {
    setup({ ui: TAG_UI });
    expect(container.querySelector("input[data-activity]")).toBeNull();
    expect(container.querySelector(".scf-label")!.textContent).toBe("Search:");
  });

  it("labels the date row per page", () => {
    setup();
    const labels = () =>
      Array.from(container.querySelectorAll(".scf-label")).map((l) => l.textContent);
    expect(labels()).toContain("Date:");
    render(null, container);
    setup({ ui: TAG_UI });
    expect(labels()).toContain("Uploaded:");
  });

  it("uses the page's artist placeholder", () => {
    setup({ ui: TAG_UI });
    expect(container.querySelector<HTMLInputElement>("#scf-search-artist")!.placeholder).toBe(
      TAG_UI.artistPlaceholder,
    );
  });
});

// --- date / likes / plays ---

function setInput(id: string, value: string): void {
  const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("date, likes and plays inputs", () => {
  it("renders native date inputs and number ranges", () => {
    setup();
    expect(container.querySelector<HTMLInputElement>("#scf-date-from")!.type).toBe("date");
    expect(container.querySelector<HTMLInputElement>("#scf-date-to")!.type).toBe("date");
    for (const id of [
      "scf-min-likes",
      "scf-max-likes",
      "scf-min-plays",
      "scf-max-plays",
      "scf-min-followers",
      "scf-max-followers",
    ]) {
      const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
      expect(input.type).toBe("number");
      expect(input.min).toBe("0");
    }
  });

  it("reads empty inputs as null", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.createdFrom).toBeNull();
    expect(filters.createdTo).toBeNull();
    expect(filters.minLikes).toBeNull();
    expect(filters.maxLikes).toBeNull();
    expect(filters.minPlays).toBeNull();
    expect(filters.maxPlays).toBeNull();
  });

  it("reads dates as YYYY-MM-DD strings and counts as numbers", async () => {
    const props = setup();
    setInput("scf-date-from", "2026-09-01");
    setInput("scf-date-to", "2026-09-30");
    setInput("scf-min-likes", "5");
    setInput("scf-max-likes", "500");
    setInput("scf-min-plays", "10");
    setInput("scf-max-plays", "10000");
    setInput("scf-min-followers", "50");
    setInput("scf-max-followers", "5000");
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.createdFrom).toBe("2026-09-01");
    expect(filters.createdTo).toBe("2026-09-30");
    expect(filters.minLikes).toBe(5);
    expect(filters.maxLikes).toBe(500);
    expect(filters.minPlays).toBe(10);
    expect(filters.maxPlays).toBe(10000);
    expect(filters.minFollowers).toBe(50);
    expect(filters.maxFollowers).toBe(5000);
  });

  it("populates the inputs from initial filters", () => {
    setup({
      initialFilters: {
        ...DEFAULT_FILTERS,
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
        minLikes: 1,
        maxLikes: 2,
        minPlays: 3,
        maxPlays: 4,
      },
    });
    expect(container.querySelector<HTMLInputElement>("#scf-date-from")!.value).toBe("2026-01-01");
    expect(container.querySelector<HTMLInputElement>("#scf-date-to")!.value).toBe("2026-01-31");
    expect(container.querySelector<HTMLInputElement>("#scf-min-likes")!.value).toBe("1");
    expect(container.querySelector<HTMLInputElement>("#scf-max-likes")!.value).toBe("2");
    expect(container.querySelector<HTMLInputElement>("#scf-min-plays")!.value).toBe("3");
    expect(container.querySelector<HTMLInputElement>("#scf-max-plays")!.value).toBe("4");
  });

  it("clear resets them", async () => {
    const props = setup({
      initialFilters: { ...DEFAULT_FILTERS, createdFrom: "2026-01-01", minLikes: 9, maxPlays: 9 },
    });
    container.querySelector<HTMLElement>("#scf-clear")!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(container.querySelector<HTMLInputElement>("#scf-date-from")!.value).toBe("");
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.createdFrom).toBeNull();
    expect(filters.minLikes).toBeNull();
    expect(filters.maxPlays).toBeNull();
  });
});

// --- "More filters" accordion ---

describe("more filters accordion", () => {
  const body = () => container.querySelector<HTMLElement>("#scf-advanced-body")!;
  const toggle = () => container.querySelector<HTMLElement>("#scf-advanced-toggle")!;

  it("is collapsed by default and hides the date, likes and plays rows", () => {
    setup();
    expect(body().style.display).toBe("none");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(body().querySelector("#scf-date-from")).not.toBeNull();
    expect(body().querySelector("#scf-min-likes")).not.toBeNull();
    expect(body().querySelector("#scf-min-plays")).not.toBeNull();
  });

  it("starts expanded when asked to", () => {
    setup({ initialAdvancedOpen: true });
    expect(body().style.display).toBe("flex");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("toggles on click and reports the new state", async () => {
    const props = setup();
    toggle().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(body().style.display).toBe("flex");
    expect(props.onAdvancedOpenChange).toHaveBeenLastCalledWith(true);

    toggle().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(body().style.display).toBe("none");
    expect(props.onAdvancedOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("still applies collapsed filters", async () => {
    const props = setup({
      initialFilters: { ...DEFAULT_FILTERS, minPlays: 100, createdFrom: "2026-09-01" },
    });
    container.querySelector<HTMLElement>("#scf-apply-reload")!.click();
    const filters = props.onApplyReload.mock.calls[0]![0];
    expect(filters.minPlays).toBe(100);
    expect(filters.createdFrom).toBe("2026-09-01");
  });

  it("counts the active filters on the toggle while collapsed, naming them in the tooltip", async () => {
    setup({
      initialFilters: { ...DEFAULT_FILTERS, minPlays: 100, createdTo: "2026-09-01" },
    });
    const badge = toggle().querySelector<HTMLElement>(".scf-advanced-count")!;
    expect(badge.textContent).toBe("2");
    expect(badge.title).toBe("Date, Plays");
    expect(badge.getAttribute("aria-label")).toBe("2 active");

    toggle().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(toggle().querySelector(".scf-advanced-count")).toBeNull();
  });

  it("counts a filter once even when both of its bounds are set", () => {
    setup({
      initialFilters: {
        ...DEFAULT_FILTERS,
        createdFrom: "2026-09-01",
        createdTo: "2026-09-30",
        minLikes: 1,
        maxLikes: 9,
        minPlays: 1,
        maxPlays: 9,
        minFollowers: 1,
        maxFollowers: 9,
      },
    });
    expect(toggle().querySelector(".scf-advanced-count")!.textContent).toBe("4");
  });

  it("uses the page's date label in the tooltip", () => {
    setup({ ui: TAG_UI, initialFilters: { ...DEFAULT_FILTERS, createdFrom: "2026-09-01" } });
    const badge = toggle().querySelector<HTMLElement>(".scf-advanced-count")!;
    expect(badge.textContent).toBe("1");
    expect(badge.title).toBe("Uploaded");
  });

  it("lists Followers in the tooltip and keeps its row inside the accordion", () => {
    setup({ initialFilters: { ...DEFAULT_FILTERS, maxFollowers: 100 } });
    expect(toggle().querySelector<HTMLElement>(".scf-advanced-count")!.title).toBe("Followers");
    expect(body().querySelector("#scf-min-followers")).not.toBeNull();
  });

  it("shows no badge when no advanced filter is set", () => {
    setup();
    expect(toggle().querySelector(".scf-advanced-count")).toBeNull();
    expect(toggle().textContent).toContain("More filters");
  });
});

// --- branding ---

describe("branding", () => {
  it("shows a small repo link with the icon and name at the top of the bar", () => {
    setup();
    const link = container.querySelector<HTMLAnchorElement>("a.scf-branding")!;
    expect(link).not.toBeNull();
    expect(container.firstElementChild).toBe(link);
    expect(link.href).toBe(REPO_URL);
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
    expect(link.textContent).toContain(APP_NAME);
    expect(link.querySelector(".scf-branding-icon svg")).not.toBeNull();
  });
});
