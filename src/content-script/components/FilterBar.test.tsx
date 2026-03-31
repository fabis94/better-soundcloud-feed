// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, type Mock } from "@voidzero-dev/vite-plus-test";
import { render } from "preact";
import { SCActivityType } from "../../shared/types";
import { DEFAULT_FILTERS } from "../../shared/stores/filter-store";
import { FilterBar } from "./FilterBar";

let container: HTMLDivElement;

interface SetupResult {
  initialFilters: Parameters<typeof FilterBar>[0]["initialFilters"];
  storageAvailable: boolean;
  onApply: Mock;
  onApplyReload: Mock;
  onHelp: Mock;
}

function setup(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}): SetupResult {
  const props = {
    initialFilters: { ...DEFAULT_FILTERS },
    storageAvailable: true,
    onApply: vi.fn(),
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
    expect(container.querySelector("#scf-apply")).not.toBeNull();
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
    container.querySelector<HTMLElement>("#scf-apply")!.click();
    expect(props.onApply.mock.calls[0]![0].activityTypes).toEqual(Object.values(SCActivityType));
  });

  it("excludes unchecked activity types", async () => {
    const props = setup();
    const cb = container.querySelector<HTMLInputElement>('input[data-activity="TrackPost"]')!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply")!.click();
    const filters = props.onApply.mock.calls[0]![0];
    expect(filters.activityTypes).not.toContain("TrackPost");
    expect(filters.activityTypes).toContain("TrackRepost");
  });

  it("reads operator from active pill button", async () => {
    const props = setup();
    container.querySelector<HTMLElement>('.scf-pill-btn[data-op="or"]')!.click();
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply")!.click();
    expect(props.onApply.mock.calls[0]![0].searchOperator).toBe("or");
  });

  it("reads simple mode by default", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply")!.click();
    expect(props.onApply.mock.calls[0]![0].searchMode).toBe("simple");
  });

  it("reads extended mode when toggled", async () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-mode-toggle")!.click();
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply")!.click();
    expect(props.onApply.mock.calls[0]![0].searchMode).toBe("extended");
  });

  it("reads search input values", async () => {
    const props = setup();
    const searchInput = container.querySelector<HTMLInputElement>("#scf-search")!;
    searchInput.value = "garage, house";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLElement>("#scf-apply")!.click();
    expect(props.onApply.mock.calls[0]![0].searchString).toBe("garage, house");
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

    container.querySelector<HTMLElement>("#scf-apply")!.click();
    const filters = props.onApply.mock.calls[0]![0];
    expect(filters.minDurationSeconds).toBe(120);
    expect(filters.maxDurationSeconds).toBe(600);
  });

  it("returns null for empty duration fields", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply")!.click();
    const filters = props.onApply.mock.calls[0]![0];
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
    expect(container.querySelector<HTMLElement>("#scf-mode-toggle")!.textContent!.trim()).toBe(
      "Simple Mode",
    );
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
  it("mode toggle switches simple to extended", async () => {
    setup();
    container.querySelector<HTMLElement>("#scf-mode-toggle")!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector<HTMLElement>(".scf-search-simple")!.style.display).toBe("none");
    expect(container.querySelector<HTMLElement>(".scf-search-extended")!.style.display).toBe(
      "flex",
    );
  });

  it("mode toggle updates button text", async () => {
    setup();
    const toggle = container.querySelector<HTMLElement>("#scf-mode-toggle")!;
    toggle.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(toggle.textContent!.trim()).toBe("Simple Mode");
    toggle.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(toggle.textContent!.trim()).toBe("Extended Mode");
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

  it("apply button calls onApply", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-apply")!.click();
    expect(props.onApply).toHaveBeenCalledTimes(1);
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

    container.querySelector<HTMLElement>("#scf-apply")!.click();
    const filters = props.onApply.mock.calls[0]![0];
    expect(filters.searchString).toBe("");
    expect(filters.searchOperator).toBe("and");
  });

  it("help button calls onHelp", () => {
    const props = setup();
    container.querySelector<HTMLElement>("#scf-help")!.click();
    expect(props.onHelp).toHaveBeenCalledTimes(1);
  });
});
