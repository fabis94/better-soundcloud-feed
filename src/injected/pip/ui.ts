import { settingsStore } from "../../shared/settings-store";
import { createLogger } from "../../shared/logger";
import playIcon from "./icons/play.svg?raw";
import pauseIcon from "./icons/pause.svg?raw";
import skipNextIcon from "./icons/skip-next.svg?raw";
import skipPrevIcon from "./icons/skip-prev.svg?raw";
import seekForwardIcon from "./icons/seek-forward.svg?raw";
import seekBackwardIcon from "./icons/seek-backward.svg?raw";

const log = createLogger("pip-ui");

const POLL_INTERVAL_MS = 250;
const WAVEFORM_BAR_WIDTH = 2;
const WAVEFORM_BAR_GAP = 1;
const WAVEFORM_HEIGHT = 56;

const CSS_VARS = [
  "--primary-color",
  "--secondary-color",
  "--surface-color",
  "--special-color",
] as const;

export interface PipController {
  startPolling(): void;
  stopPolling(): void;
}

interface WaveformData {
  samples: number[];
  height: number;
}

interface PipElements {
  title: HTMLElement;
  artist: HTMLElement;
  artwork: HTMLImageElement;
  waveformCanvas: HTMLCanvasElement;
  currentTime: HTMLElement;
  totalTime: HTMLElement;
  playPauseBtn: HTMLButtonElement;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getArtworkUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace("-large", "-t300x300");
}

function copyThemeVariables(pipDoc: Document): void {
  const computed = getComputedStyle(document.body);
  const html = pipDoc.documentElement;
  for (const name of CSS_VARS) {
    const value = computed.getPropertyValue(name).trim();
    if (value) html.style.setProperty(name, value);
  }
}

function renderWaveform(
  canvas: HTMLCanvasElement,
  samples: number[],
  maxHeight: number,
  progress: number,
  dimColor: string,
  activeColor: string,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Sync canvas resolution to its CSS layout size on every frame
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.floor(rect.width);
  const cssHeight = Math.floor(rect.height);
  if (cssWidth <= 0 || cssHeight <= 0) return;
  if (canvas.width !== cssWidth || canvas.height !== cssHeight) {
    canvas.width = cssWidth;
    canvas.height = cssHeight;
  }

  const width = canvas.width;
  const height = canvas.height;
  const barCount = Math.floor(width / (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP));
  if (barCount <= 0) return;

  ctx.clearRect(0, 0, width, height);

  const progressX = progress * width;
  const centerY = height / 2;

  for (let i = 0; i < barCount; i++) {
    const sampleIndex = Math.floor((i / barCount) * samples.length);
    const sample = samples[Math.min(sampleIndex, samples.length - 1)] ?? 0;
    const halfBar = Math.max(1, (sample / maxHeight) * centerY);
    const x = i * (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP);

    ctx.fillStyle = x < progressX ? activeColor : dimColor;
    // Draw mirrored: top half + bottom half from center
    ctx.fillRect(x, centerY - halfBar, WAVEFORM_BAR_WIDTH, halfBar);
    ctx.fillRect(x, centerY, WAVEFORM_BAR_WIDTH, halfBar);
  }
}

async function fetchWaveform(url: string): Promise<WaveformData | null> {
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return { samples: data.samples, height: data.height };
  } catch (e) {
    log.warn("Failed to fetch waveform", { url, error: e });
    return null;
  }
}

function createButton(icon: string, title: string, className: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = `pip-btn ${className}`;
  btn.title = title;
  btn.innerHTML = icon;
  return btn;
}

function buildDom(pipDoc: Document): PipElements {
  const body = pipDoc.body;
  body.innerHTML = "";

  // Title row
  const header = pipDoc.createElement("div");
  header.className = "pip-header";

  const title = pipDoc.createElement("div");
  title.className = "pip-title";
  title.textContent = "—";

  const artist = pipDoc.createElement("div");
  artist.className = "pip-artist";
  artist.textContent = "—";

  header.append(title, artist);

  // Artwork
  const artworkWrap = pipDoc.createElement("div");
  artworkWrap.className = "pip-artwork-wrap";

  const artwork = pipDoc.createElement("img");
  artwork.className = "pip-artwork";
  artwork.alt = "Cover art";

  artworkWrap.append(artwork);

  // Waveform
  const waveformWrap = pipDoc.createElement("div");
  waveformWrap.className = "pip-waveform-wrap";

  const waveformCanvas = pipDoc.createElement("canvas");
  waveformCanvas.className = "pip-waveform";
  waveformCanvas.height = WAVEFORM_HEIGHT;

  const timeRow = pipDoc.createElement("div");
  timeRow.className = "pip-time-row";

  const currentTime = pipDoc.createElement("span");
  currentTime.className = "pip-time";
  currentTime.textContent = "0:00";

  const totalTime = pipDoc.createElement("span");
  totalTime.className = "pip-time";
  totalTime.textContent = "0:00";

  timeRow.append(currentTime, totalTime);
  waveformWrap.append(waveformCanvas, timeRow);

  // Controls
  const controls = pipDoc.createElement("div");
  controls.className = "pip-controls";

  const seekBwd = createButton(seekBackwardIcon, "Seek backward", "pip-btn-seek");
  const skipPrev = createButton(skipPrevIcon, "Previous", "pip-btn-skip");
  const playPauseBtn = createButton(playIcon, "Play/Pause", "pip-btn-play");
  const skipNext = createButton(skipNextIcon, "Next", "pip-btn-skip");
  const seekFwd = createButton(seekForwardIcon, "Seek forward", "pip-btn-seek");

  controls.append(seekBwd, skipPrev, playPauseBtn, skipNext, seekFwd);

  body.append(header, artworkWrap, waveformWrap, controls);

  return { title, artist, artwork, waveformCanvas, currentTime, totalTime, playPauseBtn };
}

function injectStyles(pipDoc: Document): void {
  const style = pipDoc.createElement("style");
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--surface-color, #121212);
      color: var(--primary-color, #fff);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100vh;
      user-select: none;
    }

    .pip-header {
      padding: 12px 16px 8px;
      text-align: center;
      min-height: 0;
      flex-shrink: 0;
    }

    .pip-title {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pip-artist {
      font-size: 12px;
      color: var(--secondary-color, #999);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    .pip-artwork-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      min-height: 0;
      overflow: hidden;
    }

    .pip-artwork {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 4px;
    }

    .pip-waveform-wrap {
      padding: 8px 16px 0;
      flex-shrink: 0;
    }

    .pip-waveform {
      width: 100%;
      height: ${WAVEFORM_HEIGHT}px;
      cursor: pointer;
      display: block;
    }

    .pip-time-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }

    .pip-time {
      font-size: 11px;
      color: var(--secondary-color, #999);
      font-variant-numeric: tabular-nums;
    }

    .pip-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px 16px;
      flex-shrink: 0;
    }

    .pip-btn {
      background: none;
      border: none;
      color: var(--primary-color, #fff);
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }

    .pip-btn:hover { background: rgba(128, 128, 128, 0.2); }
    .pip-btn:active { background: rgba(128, 128, 128, 0.3); }

    .pip-btn svg { width: 20px; height: 20px; }
    .pip-btn-play svg { width: 32px; height: 32px; }
    .pip-btn-seek svg { width: 16px; height: 16px; }
  `;
  pipDoc.head.append(style);
}

export function buildPipDocument(pipWindow: Window): PipController {
  const pipDoc = pipWindow.document;

  copyThemeVariables(pipDoc);
  injectStyles(pipDoc);
  const els = buildDom(pipDoc);

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentTrackId: number | null = null;
  let waveformData: WaveformData | null = null;
  let waveformUrl: string | null = null;
  let lastIsPlaying: boolean | null = null;

  // --- Control handlers ---
  els.playPauseBtn.addEventListener("click", () => {
    window.scPlayer?.toggleCurrent?.();
  });

  els.waveformCanvas.parentElement
    ?.querySelector(".pip-btn-skip:first-child")
    ?.addEventListener("click", () => window.scPlayer?.playPrev?.());

  // Wire controls via parent traversal
  const controlBtns = pipDoc.querySelectorAll(".pip-controls .pip-btn");
  const btnArray = Array.from(controlBtns);

  // Order: seekBwd, skipPrev, playPause, skipNext, seekFwd
  btnArray[0]?.addEventListener("click", () => {
    const sound = window.scPlayer?.getCurrentSound?.();
    if (!sound) return;
    const position = sound.player?.getPosition?.() ?? 0;
    const duration = sound.player?.getDuration?.() ?? 0;
    const amount = settingsStore.get("seekSeconds") * 1000;
    if (duration > 0 && position - amount < duration * 0.1) {
      window.scPlayer?.playPrev?.();
    } else {
      window.scPlayer?.seekCurrentBy?.(() => -amount);
    }
  });

  btnArray[1]?.addEventListener("click", () => {
    window.scPlayer?.playPrev?.();
  });

  // btnArray[2] is play/pause, already wired above

  btnArray[3]?.addEventListener("click", () => {
    window.scPlayer?.playNext?.();
  });

  btnArray[4]?.addEventListener("click", () => {
    const sound = window.scPlayer?.getCurrentSound?.();
    if (!sound) return;
    const position = sound.player?.getPosition?.() ?? 0;
    const duration = sound.player?.getDuration?.() ?? 0;
    const amount = settingsStore.get("seekSeconds") * 1000;
    if (duration > 0 && position + amount > duration * 0.9) {
      window.scPlayer?.playNext?.();
    } else {
      window.scPlayer?.seekCurrentBy?.(() => amount);
    }
  });

  // Waveform click → seek
  els.waveformCanvas.addEventListener("click", (e) => {
    const rect = els.waveformCanvas.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const sound = window.scPlayer?.getCurrentSound?.();
    const duration = sound?.player?.getDuration?.() ?? 0;
    if (duration > 0) {
      window.scPlayer?.seekCurrentTo?.(() => fraction * duration);
    }
  });

  // Cache theme colors for waveform rendering
  const computed = getComputedStyle(pipDoc.documentElement);
  const dimColor = computed.getPropertyValue("--secondary-color").trim() || "#666";
  const activeColor = computed.getPropertyValue("--special-color").trim() || "#f50";

  // --- Track change ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SC player returns untyped sound model
  function onTrackChange(sound: any): void {
    if (!sound) return;
    const attrs = sound.attributes;
    els.title.textContent = attrs?.title ?? "—";
    els.artist.textContent = attrs?.publisher_metadata?.artist || attrs?.user?.username || "—";
    els.artwork.src = getArtworkUrl(attrs?.artwork_url ?? attrs?.user?.avatar_url);

    const newWfUrl = attrs?.waveform_url;
    if (newWfUrl && newWfUrl !== waveformUrl) {
      waveformUrl = newWfUrl;
      fetchWaveform(newWfUrl).then((data) => {
        if (data && waveformUrl === newWfUrl) {
          waveformData = data;
        }
      });
    }
  }

  // --- Polling ---
  function poll(): void {
    const sound = window.scPlayer?.getCurrentSound?.();
    const trackId = sound?.id ?? null;

    if (trackId !== currentTrackId) {
      currentTrackId = trackId;
      onTrackChange(sound ?? null);
    }

    const position = sound?.player?.getPosition?.() ?? 0;
    const duration = sound?.player?.getDuration?.() ?? 0;
    const progress = duration > 0 ? position / duration : 0;

    els.currentTime.textContent = formatTime(position);
    els.totalTime.textContent = formatTime(duration);

    const isPlaying = window.scPlayer?.isPlaying?.() ?? false;
    if (isPlaying !== lastIsPlaying) {
      lastIsPlaying = isPlaying;
      els.playPauseBtn.innerHTML = isPlaying ? pauseIcon : playIcon;
      els.playPauseBtn.title = isPlaying ? "Pause" : "Play";
    }

    if (waveformData) {
      renderWaveform(
        els.waveformCanvas,
        waveformData.samples,
        waveformData.height,
        progress,
        dimColor,
        activeColor,
      );
    }
  }

  function startPolling(): void {
    if (pollTimer) return;
    poll(); // immediate first update
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    log.info("PiP polling started");
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      log.info("PiP polling stopped");
    }
  }

  return { startPolling, stopPolling };
}
