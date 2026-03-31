// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";
import { render } from "preact";
import { BridgeMessageType } from "../../shared/types";
import { PipButton } from "./PipButton";

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

describe("PipButton", () => {
  it("renders with correct class", () => {
    render(<PipButton visible={true} disabled={false} />, container);
    const btn = container.querySelector(".scf-pip-btn")!;
    expect(btn).not.toBeNull();
  });

  it("contains an SVG icon", () => {
    render(<PipButton visible={true} disabled={false} />, container);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has correct title", () => {
    render(<PipButton visible={true} disabled={false} />, container);
    const btn = container.querySelector(".scf-pip-btn")!;
    expect(btn.getAttribute("title")).toBe("Toggle Picture-in-Picture");
  });

  it("posts togglePip command on click", () => {
    const spy = vi.spyOn(window, "postMessage");
    render(<PipButton visible={true} disabled={false} />, container);
    container.querySelector<HTMLElement>(".scf-pip-btn")!.click();
    expect(spy).toHaveBeenCalledWith(
      { type: BridgeMessageType.PlayerCommand, payload: { action: "togglePip" } },
      "*",
    );
    spy.mockRestore();
  });
});

describe("PipButton visibility", () => {
  it("hides when visible is false", () => {
    render(<PipButton visible={false} disabled={false} />, container);
    const btn = container.querySelector<HTMLElement>(".scf-pip-btn")!;
    expect(btn.style.display).toBe("none");
  });

  it("shows when visible is true", () => {
    render(<PipButton visible={true} disabled={false} />, container);
    const btn = container.querySelector<HTMLElement>(".scf-pip-btn")!;
    expect(btn.style.display).toBe("");
  });
});

describe("PipButton disabled state", () => {
  it("adds disabled class when disabled", () => {
    render(<PipButton visible={true} disabled={true} />, container);
    const btn = container.querySelector(".scf-pip-btn")!;
    expect(btn.classList.contains("scf-btn-disabled")).toBe(true);
  });

  it("does not add disabled class when enabled", () => {
    render(<PipButton visible={true} disabled={false} />, container);
    const btn = container.querySelector(".scf-pip-btn")!;
    expect(btn.classList.contains("scf-btn-disabled")).toBe(false);
  });

  it("does not post message when disabled", () => {
    const spy = vi.spyOn(window, "postMessage");
    render(<PipButton visible={true} disabled={true} />, container);
    container.querySelector<HTMLElement>(".scf-pip-btn")!.click();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
