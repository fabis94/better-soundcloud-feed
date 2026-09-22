import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

import { uiStore } from "./ui-store";

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  uiStore.reload();
});

describe("uiStore", () => {
  it("starts with the accordion collapsed", () => {
    expect(uiStore.get("advancedFiltersOpen")).toBe(false);
  });

  it("persists under its own key and round-trips", () => {
    uiStore.update({ advancedFiltersOpen: true });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "bscf_ui",
      JSON.stringify({ advancedFiltersOpen: true }),
    );
    uiStore.reload();
    expect(uiStore.get("advancedFiltersOpen")).toBe(true);
  });

  it("merges stored values with defaults", () => {
    localStorageMock.setItem("bscf_ui", JSON.stringify({}));
    uiStore.reload();
    expect(uiStore.get()).toEqual({ advancedFiltersOpen: false });
  });
});
