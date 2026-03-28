// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";

vi.mock("../../shared/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockGet = vi.fn((_key?: string): unknown => false);
const mockUpdate = vi.fn();
vi.mock("../../shared/settings-store", () => ({
  settingsStore: {
    get: (key?: string) => mockGet(key),
    update: (patch: Record<string, unknown>) => mockUpdate(patch),
    subscribe: vi.fn(() => () => {}),
    reload: vi.fn(),
    isAvailable: () => true,
  },
}));

import { createSettingsButton, updateSettingsButton } from "./settings-modal";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createSettingsButton", () => {
  it("creates a button with correct ID and classes", () => {
    const btn = createSettingsButton();
    expect(btn.id).toBe("scf-settings-btn");
    expect(btn.classList.contains("scf-settings-btn")).toBe(true);
  });

  it("contains an SVG icon", () => {
    const btn = createSettingsButton();
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("opens settings modal on click", () => {
    const btn = createSettingsButton();
    document.body.appendChild(btn);
    btn.click();
    const modal = document.getElementById("scf-settings-modal");
    expect(modal).not.toBeNull();
    expect(modal!.querySelector(".scf-modal-title")!.textContent).toBe("Extension Settings");
  });

  it("does not open duplicate modals", () => {
    const btn = createSettingsButton();
    document.body.appendChild(btn);
    btn.click();
    btn.click();
    expect(document.querySelectorAll("#scf-settings-modal").length).toBe(1);
  });
});

describe("updateSettingsButton", () => {
  it("adds disabled class when playerReady is false", () => {
    const el = createSettingsButton();
    updateSettingsButton(el, false);
    expect(el.classList.contains("scf-btn-disabled")).toBe(true);
  });

  it("removes disabled class when playerReady is true", () => {
    const el = createSettingsButton();
    updateSettingsButton(el, true);
    expect(el.classList.contains("scf-btn-disabled")).toBe(false);
  });
});

describe("settings modal toggle", () => {
  it("reads current skipForwardEnabled state", () => {
    mockGet.mockReturnValue(true);
    const btn = createSettingsButton();
    document.body.appendChild(btn);
    btn.click();
    const toggle = document.querySelector<HTMLInputElement>("#scf-setting-skip-forward")!;
    expect(toggle.checked).toBe(true);
  });

  it("calls settingsStore.update when toggle changes", () => {
    mockGet.mockReturnValue(false);
    const btn = createSettingsButton();
    document.body.appendChild(btn);
    btn.click();
    const toggle = document.querySelector<HTMLInputElement>("#scf-setting-skip-forward")!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    expect(mockUpdate).toHaveBeenCalledWith({ skipForwardEnabled: true });
  });
});

describe("settings modal seconds input", () => {
  it("reads current skipForwardSeconds value", () => {
    mockGet.mockImplementation((key?: string) => {
      if (key === "skipForwardSeconds") return 45;
      return false;
    });
    const btn = createSettingsButton();
    document.body.appendChild(btn);
    btn.click();
    const input = document.querySelector<HTMLInputElement>("#scf-setting-skip-seconds")!;
    expect(input.value).toBe("45");
  });

  it("calls settingsStore.update when seconds value changes", () => {
    mockGet.mockImplementation((key?: string) => {
      if (key === "skipForwardSeconds") return 30;
      return false;
    });
    const btn = createSettingsButton();
    document.body.appendChild(btn);
    btn.click();
    const input = document.querySelector<HTMLInputElement>("#scf-setting-skip-seconds")!;
    input.value = "15";
    input.dispatchEvent(new Event("change"));
    expect(mockUpdate).toHaveBeenCalledWith({ skipForwardSeconds: 15 });
  });

  it("ignores invalid (non-positive) values", () => {
    mockGet.mockImplementation((key?: string) => {
      if (key === "skipForwardSeconds") return 30;
      return false;
    });
    const btn = createSettingsButton();
    document.body.appendChild(btn);
    btn.click();
    const input = document.querySelector<HTMLInputElement>("#scf-setting-skip-seconds")!;
    input.value = "0";
    input.dispatchEvent(new Event("change"));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
