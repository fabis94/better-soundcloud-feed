// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";

vi.mock("../../shared/stores/settings-store", () => ({
  settingsStore: {
    get: (key?: string) => {
      if (key === "seekSeconds") return 30;
      return { seekEnabled: false, seekSeconds: 30 };
    },
    update: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    reload: vi.fn(),
    isAvailable: () => true,
  },
}));

import { resolveSeekAction, seekOrSkip } from "./seek";

describe("resolveSeekAction", () => {
  it("returns skipNext when seeking forward near end", () => {
    // position 95s + amount 10s = 105 > 100*0.9 = 90
    expect(resolveSeekAction(95000, 100000, 10000, 1)).toBe("skipNext");
  });

  it("returns skipPrev when seeking backward near start", () => {
    // position 5s - amount 10s = -5 < 100*0.1 = 10
    expect(resolveSeekAction(5000, 100000, 10000, -1)).toBe("skipPrev");
  });

  it("returns seek when seeking forward in middle", () => {
    // position 30s + amount 10s = 40 < 100*0.9 = 90
    expect(resolveSeekAction(30000, 100000, 10000, 1)).toBe("seek");
  });

  it("returns seek when seeking backward in middle", () => {
    // position 50s - amount 10s = 40 > 100*0.1 = 10
    expect(resolveSeekAction(50000, 100000, 10000, -1)).toBe("seek");
  });

  it("returns seek when duration is 0", () => {
    expect(resolveSeekAction(5000, 0, 10000, 1)).toBe("seek");
    expect(resolveSeekAction(5000, 0, 10000, -1)).toBe("seek");
  });

  it("returns skipNext at exact boundary (position + amount == duration * 0.9 + 1)", () => {
    // position 80s + amount 11s = 91 > 100*0.9 = 90
    expect(resolveSeekAction(80000, 100000, 11000, 1)).toBe("skipNext");
  });

  it("returns seek when position + amount equals exactly duration * 0.9", () => {
    // position 80s + amount 10s = 90 == 100*0.9 = 90 → NOT greater, so seek
    expect(resolveSeekAction(80000, 100000, 10000, 1)).toBe("seek");
  });

  it("returns skipPrev at exact boundary (position - amount == duration * 0.1 - 1)", () => {
    // position 9s - amount 10s = -1 < 100*0.1 = 10
    expect(resolveSeekAction(9000, 100000, 10000, -1)).toBe("skipPrev");
  });

  it("returns seek when position - amount equals exactly duration * 0.1", () => {
    // position 20s - amount 10s = 10 == 100*0.1 = 10 → NOT less, so seek
    expect(resolveSeekAction(20000, 100000, 10000, -1)).toBe("seek");
  });
});

describe("seekOrSkip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scPlayer = undefined as never;
  });

  it("does nothing when scPlayer is undefined", () => {
    expect(() => seekOrSkip(1)).not.toThrow();
  });

  it("does nothing when getCurrentSound returns undefined", () => {
    window.scPlayer = { getCurrentSound: () => undefined } as never;
    expect(() => seekOrSkip(1)).not.toThrow();
  });

  it("calls seekCurrentBy when in middle of track", () => {
    const seekCurrentBy = vi.fn();
    window.scPlayer = {
      getCurrentSound: () => ({
        player: {
          getPosition: () => 50000,
          getDuration: () => 300000,
        },
      }),
      seekCurrentBy,
      playNext: vi.fn(),
      playPrev: vi.fn(),
    } as never;

    seekOrSkip(1);

    expect(seekCurrentBy).toHaveBeenCalledOnce();
    // Verify the callback produces the correct offset
    const callback = seekCurrentBy.mock.calls[0]![0] as () => number;
    expect(callback()).toBe(30000); // direction=1 * 30s * 1000
  });

  it("calls playNext when seeking forward near end", () => {
    const playNext = vi.fn();
    window.scPlayer = {
      getCurrentSound: () => ({
        player: {
          getPosition: () => 280000, // near end of 300s track
          getDuration: () => 300000,
        },
      }),
      seekCurrentBy: vi.fn(),
      playNext,
      playPrev: vi.fn(),
    } as never;

    seekOrSkip(1);

    expect(playNext).toHaveBeenCalledOnce();
  });

  it("calls playPrev when seeking backward near start", () => {
    const playPrev = vi.fn();
    window.scPlayer = {
      getCurrentSound: () => ({
        player: {
          getPosition: () => 5000, // near start of 300s track
          getDuration: () => 300000,
        },
      }),
      seekCurrentBy: vi.fn(),
      playNext: vi.fn(),
      playPrev,
    } as never;

    seekOrSkip(-1);

    expect(playPrev).toHaveBeenCalledOnce();
  });

  it("calls seekCurrentBy with negative offset for backward direction", () => {
    const seekCurrentBy = vi.fn();
    window.scPlayer = {
      getCurrentSound: () => ({
        player: {
          getPosition: () => 150000,
          getDuration: () => 300000,
        },
      }),
      seekCurrentBy,
      playNext: vi.fn(),
      playPrev: vi.fn(),
    } as never;

    seekOrSkip(-1);

    expect(seekCurrentBy).toHaveBeenCalledOnce();
    const callback = seekCurrentBy.mock.calls[0]![0] as () => number;
    expect(callback()).toBe(-30000); // direction=-1 * 30s * 1000
  });
});
