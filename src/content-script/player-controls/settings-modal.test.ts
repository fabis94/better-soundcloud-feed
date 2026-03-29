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

function openModal() {
  const btn = createSettingsButton();
  document.body.appendChild(btn);
  btn.click();
  return document.getElementById("scf-settings-modal")!;
}

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
    const modal = openModal();
    expect(modal).not.toBeNull();
    expect(modal.querySelector(".scf-modal-title")!.textContent).toBe(
      "Better SC Feed Playback Settings",
    );
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

describe("settings modal initial state", () => {
  it("reads current seekEnabled state", () => {
    mockGet.mockReturnValue({ seekEnabled: true, seekSeconds: 30 });
    const modal = openModal();
    const toggle = modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!;
    expect(toggle.checked).toBe(true);
  });

  it("reads current seekSeconds value", () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 45 });
    const modal = openModal();
    const input = modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!;
    expect(input.value).toBe("45");
  });
});

describe("Apply button", () => {
  it("saves settings to store and closes modal", () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 30 });
    const modal = openModal();

    modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!.checked = true;
    modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!.value = "15";

    modal.querySelector<HTMLElement>("#scf-settings-apply")!.click();

    expect(mockUpdate).toHaveBeenCalledWith({
      seekEnabled: true,
      seekSeconds: 15,
    });
    expect(document.getElementById("scf-settings-modal")).toBeNull();
  });

  it("falls back to stored seconds for invalid values", () => {
    mockGet.mockImplementation((key?: string) => {
      if (key === "seekSeconds") return 30;
      return { seekEnabled: false, seekSeconds: 30 };
    });
    const modal = openModal();

    modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!.value = "0";
    modal.querySelector<HTMLElement>("#scf-settings-apply")!.click();

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ seekSeconds: 30 }));
  });
});

describe("Reset button", () => {
  it("restores defaults in UI without saving", () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 90 });
    const modal = openModal();

    modal.querySelector<HTMLElement>("#scf-settings-reset")!.click();

    expect(modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!.checked).toBe(true);
    expect(modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!.value).toBe("30");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("Cancel button", () => {
  it("closes modal without saving", () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 30 });
    const modal = openModal();

    modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!.checked = true;
    modal.querySelector<HTMLElement>("#scf-settings-cancel")!.click();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(document.getElementById("scf-settings-modal")).toBeNull();
  });
});

describe("closing without saving", () => {
  it("does not save when closed via X button", () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 30 });
    const modal = openModal();

    modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!.checked = true;
    modal.querySelector<HTMLElement>(".scf-modal-close")!.click();

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not save when closed via Escape", () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 30 });
    openModal();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
