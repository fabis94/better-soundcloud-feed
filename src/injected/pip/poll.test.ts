// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";

vi.mock("../../shared/utils/logger", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

vi.mock("./waveform", () => ({
  fetchWaveform: vi.fn(),
}));

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
import { fetchWaveform } from "./waveform";

function mockSound(overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    attributes: {
      title: "Test Track",
      user: { username: "TestArtist", permalink_url: "https://soundcloud.com/testartist" },
      publisher_metadata: null,
      artwork_url: "https://i1.sndcdn.com/art-large.jpg",
      permalink_url: "https://soundcloud.com/testartist/test-track",
      waveform_url: "https://wave.sndcdn.com/abc.json",
      ...overrides,
    },
    player: {
      getPosition: () => 5000,
      getDuration: () => 60000,
    },
  };
}

describe("resetSignals", () => {
  it("resets all signals to defaults", () => {
    trackTitle.value = "Some Track";
    isPlaying.value = true;
    currentTimeMs.value = 99999;

    resetSignals();

    expect(trackTitle.value).toBe("—");
    expect(isPlaying.value).toBe(false);
    expect(currentTimeMs.value).toBe(0);
    expect(waveformData.value).toBeNull();
  });
});

describe("createPipPoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSignals();
    vi.mocked(fetchWaveform).mockResolvedValue(null);
    window.scPlayer = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates signals from scPlayer on poll", () => {
    const sound = mockSound();
    window.scPlayer = {
      getCurrentSound: () => sound,
      isPlaying: () => true,
    } as unknown as typeof window.scPlayer;

    const poller = createPipPoller();
    poller.start();

    expect(trackTitle.value).toBe("Test Track");
    expect(trackArtist.value).toBe("TestArtist");
    expect(artworkSrc.value).toContain("t300x300");
    expect(trackUrl.value).toBe("https://soundcloud.com/testartist/test-track");
    expect(artistUrl.value).toBe("https://soundcloud.com/testartist");
    expect(durationMs.value).toBe(60000);
    expect(currentTimeMs.value).toBe(5000);
    expect(isPlaying.value).toBe(true);

    poller.stop();
  });

  it("prefers publisher_metadata.artist over user.username", () => {
    const sound = mockSound({
      publisher_metadata: { artist: "Real Artist" },
      user: { username: "Uploader" },
    });
    window.scPlayer = {
      getCurrentSound: () => sound,
      isPlaying: () => false,
    } as unknown as typeof window.scPlayer;

    const poller = createPipPoller();
    poller.start();

    expect(trackArtist.value).toBe("Real Artist");

    poller.stop();
  });

  it("detects track changes and clears waveform", () => {
    const sound1 = mockSound();
    const sound2 = { ...mockSound(), id: 456 };
    sound2.attributes = { ...sound2.attributes, title: "Second Track" };

    let currentSound = sound1;
    window.scPlayer = {
      getCurrentSound: () => currentSound,
      isPlaying: () => false,
    } as unknown as typeof window.scPlayer;

    const poller = createPipPoller();
    poller.start();
    expect(trackTitle.value).toBe("Test Track");

    // Switch tracks
    currentSound = sound2;
    vi.advanceTimersByTime(250);
    expect(trackTitle.value).toBe("Second Track");

    poller.stop();
  });

  it("reads liked state from DOM", () => {
    const sound = mockSound();
    window.scPlayer = {
      getCurrentSound: () => sound,
      isPlaying: () => false,
    } as unknown as typeof window.scPlayer;

    // Create a mock like button in the DOM
    const likeBtn = document.createElement("button");
    likeBtn.className = "playbackSoundBadge__like sc-button-selected";
    document.body.appendChild(likeBtn);

    const poller = createPipPoller();
    poller.start();
    expect(isLiked.value).toBe(true);

    // Unlike
    likeBtn.classList.remove("sc-button-selected");
    vi.advanceTimersByTime(250);
    expect(isLiked.value).toBe(false);

    poller.stop();
    document.body.removeChild(likeBtn);
  });

  it("handles missing scPlayer gracefully", () => {
    window.scPlayer = undefined;

    const poller = createPipPoller();
    poller.start();

    expect(trackTitle.value).toBe("—");
    expect(currentTimeMs.value).toBe(0);
    expect(isPlaying.value).toBe(false);

    poller.stop();
  });

  it("stop clears the interval", () => {
    window.scPlayer = undefined;
    const poller = createPipPoller();
    poller.start();
    poller.stop();

    // Advancing timers should not cause errors
    vi.advanceTimersByTime(1000);
  });

  it("fetches waveform on track change", () => {
    const sound = mockSound();
    window.scPlayer = {
      getCurrentSound: () => sound,
      isPlaying: () => false,
    } as unknown as typeof window.scPlayer;

    const poller = createPipPoller();
    poller.start();

    expect(fetchWaveform).toHaveBeenCalledWith("https://wave.sndcdn.com/abc.json");

    poller.stop();
  });
});
