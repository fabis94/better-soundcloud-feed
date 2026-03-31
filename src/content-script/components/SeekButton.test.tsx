// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";
import { render } from "preact";
import { BridgeMessageType } from "../../shared/types";
import { SeekButton } from "./SeekButton";

let container: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  document.body.innerHTML = "";
});

describe("SeekButton forward", () => {
  it("renders a button with correct classes", () => {
    render(<SeekButton direction="seekForward" visible={true} playerReady={true} />, container);
    const btn = container.querySelector("button")!;
    expect(btn.classList.contains("skipControl")).toBe(true);
    expect(btn.classList.contains("scf-seek-forward")).toBe(true);
  });

  it("contains an SVG icon", () => {
    render(<SeekButton direction="seekForward" visible={true} playerReady={true} />, container);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("posts SC_PLAYER_COMMAND with seekForward on click", () => {
    const spy = vi.spyOn(window, "postMessage");
    render(<SeekButton direction="seekForward" visible={true} playerReady={true} />, container);
    container.querySelector("button")!.click();
    expect(spy).toHaveBeenCalledWith(
      { type: BridgeMessageType.PlayerCommand, payload: { action: "seekForward" } },
      "*",
    );
    spy.mockRestore();
  });
});

describe("SeekButton backward", () => {
  it("renders a button with correct classes", () => {
    render(<SeekButton direction="seekBackward" visible={true} playerReady={true} />, container);
    const btn = container.querySelector("button")!;
    expect(btn.classList.contains("skipControl")).toBe(true);
    expect(btn.classList.contains("scf-seek-backward")).toBe(true);
  });

  it("posts SC_PLAYER_COMMAND with seekBackward on click", () => {
    const spy = vi.spyOn(window, "postMessage");
    render(<SeekButton direction="seekBackward" visible={true} playerReady={true} />, container);
    container.querySelector("button")!.click();
    expect(spy).toHaveBeenCalledWith(
      { type: BridgeMessageType.PlayerCommand, payload: { action: "seekBackward" } },
      "*",
    );
    spy.mockRestore();
  });
});

describe("SeekButton visibility and disabled", () => {
  it("hides button when visible is false", () => {
    render(<SeekButton direction="seekForward" visible={false} playerReady={true} />, container);
    expect(container.querySelector("button")!.style.display).toBe("none");
  });

  it("shows button when visible is true", () => {
    render(<SeekButton direction="seekForward" visible={true} playerReady={true} />, container);
    expect(container.querySelector("button")!.style.display).toBe("");
  });

  it("disables button when playerReady is false", () => {
    render(<SeekButton direction="seekForward" visible={true} playerReady={false} />, container);
    const btn = container.querySelector("button")!;
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("scf-btn-disabled")).toBe(true);
  });

  it("enables button when playerReady is true", () => {
    render(<SeekButton direction="seekForward" visible={true} playerReady={true} />, container);
    const btn = container.querySelector("button")!;
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains("scf-btn-disabled")).toBe(false);
  });
});
