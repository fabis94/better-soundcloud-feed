// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "@voidzero-dev/vite-plus-test";
import { renderWaveform, fetchWaveform, WAVEFORM_BAR_WIDTH, WAVEFORM_BAR_GAP } from "./waveform";

vi.mock("../../shared/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

function createMockCanvas(width: number, height: number) {
  const fillRects: Array<[number, number, number, number]> = [];
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn((...args: [number, number, number, number]) => fillRects.push(args)),
    fillStyle: "",
  };
  const canvas = {
    getContext: () => ctx,
    getBoundingClientRect: () => ({
      width,
      height,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
    }),
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx, fillRects };
}

describe("renderWaveform", () => {
  it("renders bars with correct count based on canvas width", () => {
    const canvasWidth = 100;
    const canvasHeight = 32;
    const { canvas, fillRects } = createMockCanvas(canvasWidth, canvasHeight);
    const samples = Array.from({ length: 200 }, () => 50);
    const maxHeight = 100;

    renderWaveform(canvas, samples, maxHeight, 0.5, "#ccc", "#f00");

    const expectedBarCount = Math.floor(canvasWidth / (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP));
    expect(fillRects.length).toBe(expectedBarCount);
  });

  it("uses activeColor for bars before progress point and dimColor after", () => {
    const canvasWidth = 30;
    const canvasHeight = 32;
    const { canvas, ctx } = createMockCanvas(canvasWidth, canvasHeight);
    const samples = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
    const maxHeight = 100;
    const dimColor = "#ccc";
    const activeColor = "#f00";

    const fillStyles: string[] = [];
    const originalFillRect = ctx.fillRect;
    ctx.fillRect = vi.fn((...args: [number, number, number, number]) => {
      fillStyles.push(ctx.fillStyle);
      return originalFillRect(...args);
    }) as unknown as typeof ctx.fillRect;

    renderWaveform(canvas, samples, maxHeight, 0.5, dimColor, activeColor);

    const progressX = 0.5 * canvasWidth;
    const barStep = WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP;
    const barCount = Math.floor(canvasWidth / barStep);

    for (let i = 0; i < barCount; i++) {
      const x = i * barStep;
      if (x < progressX) {
        expect(fillStyles[i]).toBe(activeColor);
      } else {
        expect(fillStyles[i]).toBe(dimColor);
      }
    }
  });

  it("bars grow upward from bottom (y = height - barHeight)", () => {
    const canvasWidth = 10;
    const canvasHeight = 32;
    const { canvas, fillRects } = createMockCanvas(canvasWidth, canvasHeight);
    const samples = [80];
    const maxHeight = 100;

    renderWaveform(canvas, samples, maxHeight, 0, "#ccc", "#f00");

    expect(fillRects.length).toBeGreaterThan(0);
    for (const [, y, , h] of fillRects) {
      expect(y + h).toBe(canvasHeight);
    }
  });

  it("syncs canvas width/height from getBoundingClientRect", () => {
    const cssWidth = 150;
    const cssHeight = 40;
    const { canvas } = createMockCanvas(cssWidth, cssHeight);
    const samples = [50, 60, 70];
    const maxHeight = 100;

    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);

    renderWaveform(canvas, samples, maxHeight, 0, "#ccc", "#f00");

    expect(canvas.width).toBe(cssWidth);
    expect(canvas.height).toBe(cssHeight);
  });

  it("returns early for zero-width canvas", () => {
    const { canvas, ctx } = createMockCanvas(0, 32);
    const samples = [50, 60];

    renderWaveform(canvas, samples, 100, 0.5, "#ccc", "#f00");

    expect(ctx.clearRect).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("returns early when getContext returns null", () => {
    const canvas = {
      getContext: () => null,
      getBoundingClientRect: () => ({
        width: 100,
        height: 32,
        left: 0,
        top: 0,
        right: 100,
        bottom: 32,
      }),
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    // Should not throw
    renderWaveform(canvas, [50, 60], 100, 0.5, "#ccc", "#f00");
  });
});

describe("fetchWaveform", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed samples and height on success", async () => {
    const mockData = { samples: [10, 20, 30], height: 100 };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchWaveform("https://example.com/waveform.json");

    expect(result).toEqual({ samples: [10, 20, 30], height: 100 });
    expect(fetch).toHaveBeenCalledWith("https://example.com/waveform.json");
  });

  it("returns null on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await fetchWaveform("https://example.com/waveform.json");

    expect(result).toBeNull();
  });

  it("returns null on invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    } as Response);

    const result = await fetchWaveform("https://example.com/waveform.json");

    expect(result).toBeNull();
  });
});
