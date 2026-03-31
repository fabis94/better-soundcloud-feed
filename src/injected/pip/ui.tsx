import { render } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { signal, useComputed } from "@preact/signals";
import { REPO_URL } from "../../shared/constants";
import { createLogger } from "../../shared/logger";
import { seekOrSkip } from "../seek";
import playIcon from "./icons/play.svg?raw";
import pauseIcon from "./icons/pause.svg?raw";
import skipNextIcon from "./icons/skip-next.svg?raw";
import skipPrevIcon from "./icons/skip-prev.svg?raw";
import seekForwardIcon from "./icons/seek-forward.svg?raw";
import seekBackwardIcon from "./icons/seek-backward.svg?raw";
import heartIcon from "./icons/heart.svg?raw";
import heartFilledIcon from "./icons/heart-filled.svg?raw";
import brandingIcon from "../../../public/icon.svg?raw";

const log = createLogger("pip-ui");

const POLL_INTERVAL_MS = 250;
const WAVEFORM_BAR_WIDTH = 2;
const WAVEFORM_BAR_GAP = 1;
const WAVEFORM_HEIGHT = 32;

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

// --- Reactive state ---

const trackTitle = signal("—");
const trackArtist = signal("—");
const artworkSrc = signal("");
const trackUrl = signal<string | null>(null);
const artistUrl = signal<string | null>(null);
const currentTimeMs = signal(0);
const durationMs = signal(0);
const isPlaying = signal(false);
const isLiked = signal(false);
const waveformData = signal<WaveformData | null>(null);

// --- Utilities ---

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

function handleLike(): void {
  const sound = window.scPlayer?.getCurrentSound?.();
  if (!sound || !window.scSocialActions) return;
  window.scSocialActions.like(sound).then(({ state }) => {
    isLiked.value = state;
  });
}

// --- Components ---

function SvgIcon({ html, className }: { html: string; className?: string }) {
  return <span class={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Header() {
  const titleRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const title = trackTitle.value;

  useEffect(() => {
    const span = titleRef.current;
    const wrap = wrapRef.current;
    if (!span || !wrap) return;
    span.classList.remove("pip-marquee");
    requestAnimationFrame(() => {
      if (span.scrollWidth > wrap.clientWidth) {
        const offset = -(span.scrollWidth - wrap.clientWidth);
        span.style.setProperty("--marquee-offset", `${offset}px`);
        span.classList.add("pip-marquee");
      }
    });
  }, [title]);

  return (
    <div class="pip-header">
      <div class="pip-title-row">
        <div
          ref={wrapRef}
          class="pip-title"
          onClick={() => trackUrl.value && window.open(trackUrl.value, "_blank")}
        >
          <span ref={titleRef} class="pip-title-text">
            {title}
          </span>
        </div>
        <button
          class={`pip-btn pip-btn-like${isLiked.value ? " pip-liked" : ""}`}
          title="Like"
          onClick={handleLike}
        >
          <SvgIcon html={isLiked.value ? heartFilledIcon : heartIcon} />
        </button>
      </div>
      <div
        class="pip-artist"
        onClick={() => artistUrl.value && window.open(artistUrl.value, "_blank")}
      >
        {trackArtist.value}
      </div>
    </div>
  );
}

function Artwork() {
  const src = artworkSrc.value;
  return (
    <div class="pip-artwork-wrap">
      {src && <img class="pip-artwork" src={src} alt="Cover art" />}
    </div>
  );
}

function WaveformCanvas({ dimColor, activeColor }: { dimColor: string; activeColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = waveformData.value;
  const progress = useComputed(() => {
    const d = durationMs.value;
    return d > 0 ? currentTimeMs.value / d : 0;
  });

  // Canvas drawing is inherently imperative — useEffect on every relevant signal change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
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
    const progressX = progress.value * width;

    for (let i = 0; i < barCount; i++) {
      const sampleIndex = Math.floor((i / barCount) * data.samples.length);
      const sample = data.samples[Math.min(sampleIndex, data.samples.length - 1)] ?? 0;
      const barHeight = Math.max(2, (sample / data.height) * height);
      const x = i * (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP);
      ctx.fillStyle = x < progressX ? activeColor : dimColor;
      ctx.fillRect(x, height - barHeight, WAVEFORM_BAR_WIDTH, barHeight);
    }
  });

  const handleClick = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const dur = window.scPlayer?.getCurrentSound?.()?.player?.getDuration?.() ?? 0;
    if (dur > 0) {
      window.scPlayer?.seekCurrentTo?.(() => fraction * dur);
    }
  };

  return (
    <div class="pip-waveform-wrap">
      <canvas ref={canvasRef} class="pip-waveform" height={WAVEFORM_HEIGHT} onClick={handleClick} />
      <div class="pip-time-row">
        <span class="pip-time">{formatTime(currentTimeMs.value)}</span>
        <span class="pip-time">{formatTime(durationMs.value)}</span>
      </div>
    </div>
  );
}

function ControlButton({
  icon,
  title,
  className,
  onClick,
}: {
  icon: string;
  title: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button class={`pip-btn ${className}`} title={title} onClick={onClick}>
      <SvgIcon html={icon} />
    </button>
  );
}

function Controls() {
  return (
    <div class="pip-controls">
      <ControlButton
        icon={seekBackwardIcon}
        title="Seek backward"
        className="pip-btn-seek"
        onClick={() => seekOrSkip(-1)}
      />
      <ControlButton
        icon={skipPrevIcon}
        title="Previous"
        className="pip-btn-skip"
        onClick={() => window.scPlayer?.playPrev?.()}
      />
      <ControlButton
        icon={isPlaying.value ? pauseIcon : playIcon}
        title={isPlaying.value ? "Pause" : "Play"}
        className="pip-btn-play"
        onClick={() => window.scPlayer?.toggleCurrent?.()}
      />
      <ControlButton
        icon={skipNextIcon}
        title="Next"
        className="pip-btn-skip"
        onClick={() => window.scPlayer?.playNext?.()}
      />
      <ControlButton
        icon={seekForwardIcon}
        title="Seek forward"
        className="pip-btn-seek"
        onClick={() => seekOrSkip(1)}
      />
    </div>
  );
}

function Branding() {
  return (
    <div class="pip-branding" onClick={() => window.open(REPO_URL, "_blank")}>
      <SvgIcon html={brandingIcon} className="pip-branding-icon" />
      {" Better SoundCloud Feed"}
    </div>
  );
}

function PipApp({ dimColor, activeColor }: { dimColor: string; activeColor: string }) {
  return (
    <>
      <Header />
      <Artwork />
      <WaveformCanvas dimColor={dimColor} activeColor={activeColor} />
      <Controls />
      <Branding />
    </>
  );
}

// --- Styles ---

const PIP_STYLES = `
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
    min-height: 0;
    flex-shrink: 0;
  }

  .pip-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pip-title {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    cursor: pointer;
  }

  .pip-title:hover { text-decoration: underline; }
  .pip-title-text { display: inline-block; }

  .pip-title-text.pip-marquee {
    animation: pip-marquee 8s linear infinite;
  }

  @keyframes pip-marquee {
    0% { transform: translateX(0); }
    10% { transform: translateX(0); }
    90% { transform: translateX(var(--marquee-offset)); }
    100% { transform: translateX(var(--marquee-offset)); }
  }

  .pip-btn-like {
    flex-shrink: 0;
    padding: 4px;
    color: var(--secondary-color, #999);
  }

  .pip-btn-like.pip-liked { color: var(--special-color, #f50); }
  .pip-btn-like svg { width: 18px; height: 18px; }

  .pip-artist {
    font-size: 12px;
    color: var(--secondary-color, #999);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
    cursor: pointer;
  }

  .pip-artist:hover { text-decoration: underline; }

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
    padding: 8px 8px;
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

  .pip-branding {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 9px;
    color: var(--secondary-color, #999);
    opacity: 0.8;
    padding-bottom: 6px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .pip-branding-icon svg { width: 12px; height: 12px; }
`;

// --- Setup & polling ---

function copyThemeVariables(pipDoc: Document): void {
  const computed = getComputedStyle(document.body);
  const html = pipDoc.documentElement;
  for (const name of CSS_VARS) {
    const value = computed.getPropertyValue(name).trim();
    if (value) html.style.setProperty(name, value);
  }
}

export function buildPipDocument(pipWindow: Window): PipController {
  const pipDoc = pipWindow.document;

  copyThemeVariables(pipDoc);

  const style = pipDoc.createElement("style");
  style.textContent = PIP_STYLES;
  pipDoc.head.append(style);

  const computed = getComputedStyle(pipDoc.documentElement);
  const dimColor = computed.getPropertyValue("--secondary-color").trim() || "#666";
  const activeColor = computed.getPropertyValue("--special-color").trim() || "#f50";

  // Reset signals to avoid stale state from a previous PiP session
  trackTitle.value = "—";
  trackArtist.value = "—";
  artworkSrc.value = "";
  trackUrl.value = null;
  artistUrl.value = null;
  currentTimeMs.value = 0;
  durationMs.value = 0;
  isPlaying.value = false;
  isLiked.value = false;
  waveformData.value = null;

  render(<PipApp dimColor={dimColor} activeColor={activeColor} />, pipDoc.body);

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentTrackId: number | null = null;
  let waveformUrl: string | null = null;
  let cachedLikeBtn: Element | null = null;

  function poll(): void {
    const sound = window.scPlayer?.getCurrentSound?.();
    const trackId = sound?.id ?? null;

    if (trackId !== currentTrackId) {
      currentTrackId = trackId;
      waveformData.value = null;
      cachedLikeBtn = document.querySelector(".playbackSoundBadge__like");
      if (sound) {
        const attrs = sound.attributes;
        trackTitle.value = attrs?.title ?? "—";
        trackArtist.value = attrs?.publisher_metadata?.artist || attrs?.user?.username || "—";
        artworkSrc.value = getArtworkUrl(attrs?.artwork_url ?? attrs?.user?.avatar_url);
        trackUrl.value = attrs?.permalink_url ?? null;
        artistUrl.value = attrs?.user?.permalink_url ?? null;
        durationMs.value = sound.player?.getDuration?.() ?? 0;

        const newWfUrl = attrs?.waveform_url;
        if (newWfUrl && newWfUrl !== waveformUrl) {
          waveformUrl = newWfUrl;
          fetchWaveform(newWfUrl).then((data) => {
            if (data && waveformUrl === newWfUrl) {
              waveformData.value = data;
            }
          });
        }
      }
    }

    currentTimeMs.value = sound?.player?.getPosition?.() ?? 0;
    isPlaying.value = window.scPlayer?.isPlaying?.() ?? false;
    isLiked.value = cachedLikeBtn?.classList.contains("sc-button-selected") ?? false;
  }

  function startPolling(): void {
    if (pollTimer) return;
    poll();
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
