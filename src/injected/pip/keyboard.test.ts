import { describe, it, expect } from "@voidzero-dev/vite-plus-test";
import { isPlayerShortcut } from "./keyboard";

function key(
  k: string,
  mods: Partial<Pick<KeyboardEvent, "shiftKey" | "ctrlKey" | "altKey" | "metaKey">> = {},
): Pick<KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey"> {
  return {
    key: k,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...mods,
  };
}

describe("isPlayerShortcut", () => {
  describe("allows player-control keys", () => {
    it.each([
      ["Space", " ", {}],
      ["ArrowRight", "ArrowRight", {}],
      ["ArrowLeft", "ArrowLeft", {}],
      ["Shift+ArrowRight", "ArrowRight", { shiftKey: true }],
      ["Shift+ArrowLeft", "ArrowLeft", { shiftKey: true }],
      ["Shift+ArrowUp", "ArrowUp", { shiftKey: true }],
      ["Shift+ArrowDown", "ArrowDown", { shiftKey: true }],
      ["L (like)", "l", {}],
      ["M (mute)", "m", {}],
      ["0", "0", {}],
      ["5", "5", {}],
      ["9", "9", {}],
    ] as const)("%s", (_label, k, mods) => {
      expect(isPlayerShortcut(key(k, mods))).toBe(true);
    });
  });

  describe("rejects non-player keys", () => {
    it.each([
      ["S (search)", "s", {}],
      ["P (navigate)", "p", {}],
      ["H (help)", "h", {}],
      ["G (go prefix)", "g", {}],
      ["Q (next up)", "q", {}],
      ["R (repost)", "r", {}],
      ["Shift+S (shuffle)", "S", { shiftKey: true }],
      ["Shift+L (repeat)", "L", { shiftKey: true }],
    ] as const)("%s", (_label, k, mods) => {
      expect(isPlayerShortcut(key(k, mods))).toBe(false);
    });
  });

  it("rejects Ctrl/Alt/Meta combos of allowed keys", () => {
    expect(isPlayerShortcut(key(" ", { ctrlKey: true }))).toBe(false);
    expect(isPlayerShortcut(key("l", { altKey: true }))).toBe(false);
    expect(isPlayerShortcut(key("m", { metaKey: true }))).toBe(false);
  });
});
