import { createLogger } from "../../shared/utils/logger";

const log = createLogger("waveform");

export const WAVEFORM_BAR_WIDTH = 2;
export const WAVEFORM_BAR_GAP = 1;
export const WAVEFORM_HEIGHT = 32;

export interface WaveformData {
  samples: number[];
  height: number;
}

export function renderWaveform(
  canvas: HTMLCanvasElement,
  samples: number[],
  maxHeight: number,
  progress: number,
  dimColor: string,
  activeColor: string,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.floor(rect.width);
  const cssHeight = Math.floor(rect.height);
  if (cssWidth <= 0 || cssHeight <= 0) return;
  if (canvas.width !== cssWidth || canvas.height !== cssHeight) {
    canvas.width = cssWidth;
    canvas.height = cssHeight;
  }

  const { width, height } = canvas;
  const barCount = Math.floor(width / (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP));
  if (barCount <= 0) return;

  ctx.clearRect(0, 0, width, height);
  const progressX = progress * width;

  for (let i = 0; i < barCount; i++) {
    const sampleIndex = Math.floor((i / barCount) * samples.length);
    const sample = samples[Math.min(sampleIndex, samples.length - 1)] ?? 0;
    const barHeight = Math.max(2, (sample / maxHeight) * height);
    const x = i * (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP);
    ctx.fillStyle = x < progressX ? activeColor : dimColor;
    ctx.fillRect(x, height - barHeight, WAVEFORM_BAR_WIDTH, barHeight);
  }
}

export async function fetchWaveform(url: string): Promise<WaveformData | null> {
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return { samples: data.samples, height: data.height };
  } catch (e) {
    log.warn("Failed to fetch waveform", { url, error: e });
    return null;
  }
}
