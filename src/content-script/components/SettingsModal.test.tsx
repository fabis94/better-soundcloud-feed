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

import { openSettingsModal } from "./SettingsModal";

function openModal() {
  mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 30 });
  openSettingsModal();
  return document.getElementById("scf-settings-modal")!;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SettingsModal", () => {
  it("renders with correct title", () => {
    const modal = openModal();
    expect(modal.querySelector(".scf-modal-title")!.textContent).toBe(
      "Better SC Feed Playback Settings",
    );
  });

  it("does not open duplicate modals", () => {
    openModal();
    openSettingsModal();
    expect(document.querySelectorAll("#scf-settings-modal").length).toBe(1);
  });
});

describe("settings modal initial state", () => {
  it("reads current seekEnabled state", () => {
    mockGet.mockReturnValue({ seekEnabled: true, seekSeconds: 30 });
    openSettingsModal();
    const modal = document.getElementById("scf-settings-modal")!;
    const toggle = modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!;
    expect(toggle.checked).toBe(true);
  });

  it("reads current seekSeconds value", () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 45 });
    openSettingsModal();
    const modal = document.getElementById("scf-settings-modal")!;
    const input = modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!;
    expect(input.value).toBe("45");
  });
});

describe("Apply button", () => {
  it("saves settings to store and closes modal", () => {
    const modal = openModal();

    modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!.checked = true;
    // Preact needs input events to trigger onChange
    modal
      .querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!
      .dispatchEvent(new Event("change", { bubbles: true }));
    modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!.value = "15";
    modal
      .querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!
      .dispatchEvent(new Event("input", { bubbles: true }));

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
    openSettingsModal();
    const modal = document.getElementById("scf-settings-modal")!;

    modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!.value = "0";
    modal
      .querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!
      .dispatchEvent(new Event("input", { bubbles: true }));
    modal.querySelector<HTMLElement>("#scf-settings-apply")!.click();

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ seekSeconds: 30 }));
  });
});

describe("Reset button", () => {
  it("restores defaults in UI without saving", async () => {
    mockGet.mockReturnValue({ seekEnabled: false, seekSeconds: 90 });
    openSettingsModal();
    const modal = document.getElementById("scf-settings-modal")!;

    modal.querySelector<HTMLElement>("#scf-settings-reset")!.click();
    // Signal updates trigger async Preact re-render
    await new Promise((r) => setTimeout(r, 0));

    expect(modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!.checked).toBe(true);
    expect(modal.querySelector<HTMLInputElement>("#scf-setting-seek-seconds")!.value).toBe("30");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("Cancel button", () => {
  it("closes modal without saving", () => {
    const modal = openModal();

    modal.querySelector<HTMLInputElement>("#scf-setting-seek-enabled")!.checked = true;
    modal.querySelector<HTMLElement>("#scf-settings-cancel")!.click();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(document.getElementById("scf-settings-modal")).toBeNull();
  });
});

describe("closing without saving", () => {
  it("does not save when closed via X button", () => {
    openModal();

    document.querySelector<HTMLElement>(".scf-modal-close")!.click();

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not save when closed via Escape", () => {
    openModal();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
