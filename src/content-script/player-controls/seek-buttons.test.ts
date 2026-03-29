// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";
import {
  createSeekForwardButton,
  createSeekBackwardButton,
  updateSeekButton,
} from "./seek-buttons";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSeekForwardButton", () => {
  it("creates a button with correct ID and classes", () => {
    const btn = createSeekForwardButton();
    expect(btn.id).toBe("scf-seek-forward-btn");
    expect(btn.classList.contains("skipControl")).toBe(true);
    expect(btn.classList.contains("scf-seek-forward")).toBe(true);
  });

  it("contains an SVG icon", () => {
    const btn = createSeekForwardButton();
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("posts SC_PLAYER_COMMAND with seekForward on click", () => {
    const spy = vi.spyOn(window, "postMessage");
    const btn = createSeekForwardButton();
    btn.click();
    expect(spy).toHaveBeenCalledWith(
      { type: "SC_PLAYER_COMMAND", payload: { action: "seekForward" } },
      "*",
    );
    spy.mockRestore();
  });
});

describe("createSeekBackwardButton", () => {
  it("creates a button with correct ID and classes", () => {
    const btn = createSeekBackwardButton();
    expect(btn.id).toBe("scf-seek-backward-btn");
    expect(btn.classList.contains("skipControl")).toBe(true);
    expect(btn.classList.contains("scf-seek-backward")).toBe(true);
  });

  it("contains an SVG icon", () => {
    const btn = createSeekBackwardButton();
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("posts SC_PLAYER_COMMAND with seekBackward on click", () => {
    const spy = vi.spyOn(window, "postMessage");
    const btn = createSeekBackwardButton();
    btn.click();
    expect(spy).toHaveBeenCalledWith(
      { type: "SC_PLAYER_COMMAND", payload: { action: "seekBackward" } },
      "*",
    );
    spy.mockRestore();
  });
});

describe("updateSeekButton", () => {
  it("hides button when visible is false", () => {
    const btn = createSeekForwardButton();
    updateSeekButton(btn, { visible: false, playerReady: true });
    expect(btn.style.display).toBe("none");
  });

  it("shows button when visible is true", () => {
    const btn = createSeekForwardButton();
    updateSeekButton(btn, { visible: false, playerReady: true });
    updateSeekButton(btn, { visible: true, playerReady: true });
    expect(btn.style.display).toBe("");
  });

  it("disables button when playerReady is false", () => {
    const btn = createSeekForwardButton();
    updateSeekButton(btn, { visible: true, playerReady: false });
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("scf-btn-disabled")).toBe(true);
  });

  it("enables button when playerReady is true", () => {
    const btn = createSeekForwardButton();
    updateSeekButton(btn, { visible: true, playerReady: true });
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains("scf-btn-disabled")).toBe(false);
  });
});
