// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";

vi.mock("./seek", () => ({
  seekOrSkip: vi.fn(),
}));

import { handlePlayerCommand } from "./commands";
import { seekOrSkip } from "./seek";

describe("handlePlayerCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scPlayer = {
      toggleCurrent: vi.fn(),
      playNext: vi.fn(),
      playPrev: vi.fn(),
      seekCurrentBy: vi.fn(),
    } as never;
  });

  it("calls seekOrSkip(1) for seekForward", () => {
    handlePlayerCommand({ action: "seekForward" });
    expect(seekOrSkip).toHaveBeenCalledWith(1);
  });

  it("calls seekOrSkip(-1) for seekBackward", () => {
    handlePlayerCommand({ action: "seekBackward" });
    expect(seekOrSkip).toHaveBeenCalledWith(-1);
  });

  it("calls toggleCurrent for togglePlay", () => {
    handlePlayerCommand({ action: "togglePlay" });
    expect(window.scPlayer?.toggleCurrent).toHaveBeenCalledOnce();
  });

  it("calls playNext for skipNext", () => {
    handlePlayerCommand({ action: "skipNext" });
    expect(window.scPlayer?.playNext).toHaveBeenCalledOnce();
  });

  it("calls playPrev for skipPrev", () => {
    handlePlayerCommand({ action: "skipPrev" });
    expect(window.scPlayer?.playPrev).toHaveBeenCalledOnce();
  });

  it("does not throw when scPlayer is undefined", () => {
    window.scPlayer = undefined as never;
    expect(() => handlePlayerCommand({ action: "togglePlay" })).not.toThrow();
    expect(() => handlePlayerCommand({ action: "skipNext" })).not.toThrow();
    expect(() => handlePlayerCommand({ action: "skipPrev" })).not.toThrow();
    expect(() => handlePlayerCommand({ action: "seekForward" })).not.toThrow();
    expect(() => handlePlayerCommand({ action: "seekBackward" })).not.toThrow();
  });
});
