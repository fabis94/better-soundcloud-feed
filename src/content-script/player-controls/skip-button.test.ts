// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";
import { createSkipButton, updateSkipButton } from "./skip-button";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSkipButton", () => {
  it("creates a button with correct ID and classes", () => {
    const btn = createSkipButton();
    expect(btn.id).toBe("scf-skip-forward-btn");
    expect(btn.classList.contains("skipControl")).toBe(true);
    expect(btn.classList.contains("scf-skip-forward")).toBe(true);
  });

  it("contains an SVG icon", () => {
    const btn = createSkipButton();
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("posts SC_PLAYER_COMMAND on click", () => {
    const spy = vi.spyOn(window, "postMessage");
    const btn = createSkipButton();
    btn.click();
    expect(spy).toHaveBeenCalledWith(
      { type: "SC_PLAYER_COMMAND", payload: { action: "skipForward" } },
      "*",
    );
    spy.mockRestore();
  });
});

describe("updateSkipButton", () => {
  it("hides button when visible is false", () => {
    const btn = createSkipButton();
    updateSkipButton(btn, { visible: false, playerReady: true });
    expect(btn.style.display).toBe("none");
  });

  it("shows button when visible is true", () => {
    const btn = createSkipButton();
    updateSkipButton(btn, { visible: false, playerReady: true });
    updateSkipButton(btn, { visible: true, playerReady: true });
    expect(btn.style.display).toBe("");
  });

  it("disables button when playerReady is false", () => {
    const btn = createSkipButton();
    updateSkipButton(btn, { visible: true, playerReady: false });
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("scf-btn-disabled")).toBe(true);
  });

  it("enables button when playerReady is true", () => {
    const btn = createSkipButton();
    updateSkipButton(btn, { visible: true, playerReady: true });
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains("scf-btn-disabled")).toBe(false);
  });
});
