import { render } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { useComputed } from "@preact/signals";
import { REPO_URL } from "../../shared/constants";
import { formatTime } from "../../shared/utils/format";
import { seekOrSkip } from "../player/seek";
import {
  trackTitle,
  trackArtist,
  artworkSrc,
  trackUrl,
  artistUrl,
  currentTimeMs,
  durationMs,
  isPlaying,
  isLiked,
  waveformData,
  resetSignals,
  createPipPoller,
} from "./poll";
import { renderWaveform, WAVEFORM_HEIGHT } from "./waveform";
import { PIP_STYLES, copyThemeVariables } from "./styles";
import playIcon from "./icons/play.svg?raw";
import pauseIcon from "./icons/pause.svg?raw";
import skipNextIcon from "./icons/skip-next.svg?raw";
import skipPrevIcon from "./icons/skip-prev.svg?raw";
import seekForwardIcon from "./icons/seek-forward.svg?raw";
import seekBackwardIcon from "./icons/seek-backward.svg?raw";
import heartIcon from "./icons/heart.svg?raw";
import heartFilledIcon from "./icons/heart-filled.svg?raw";
import brandingIcon from "../../../public/icon.svg?raw";

export interface PipController {
  startPolling(): void;
  stopPolling(): void;
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
          onClick={() => {
            const sound = window.scPlayer?.getCurrentSound?.();
            if (!sound || !window.scSocialActions) return;
            window.scSocialActions.like(sound).then(({ state }) => {
              isLiked.value = state;
            });
          }}
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    renderWaveform(canvas, data.samples, data.height, progress.value, dimColor, activeColor);
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

// --- Setup ---

export function buildPipDocument(pipWindow: Window): PipController {
  const pipDoc = pipWindow.document;

  copyThemeVariables(pipDoc);

  const style = pipDoc.createElement("style");
  style.textContent = PIP_STYLES;
  pipDoc.head.append(style);

  const computed = getComputedStyle(pipDoc.documentElement);
  const dimColor = computed.getPropertyValue("--secondary-color").trim() || "#666";
  const activeColor = computed.getPropertyValue("--special-color").trim() || "#f50";

  resetSignals();
  render(<PipApp dimColor={dimColor} activeColor={activeColor} />, pipDoc.body);

  const poller = createPipPoller();
  return { startPolling: poller.start, stopPolling: poller.stop };
}
