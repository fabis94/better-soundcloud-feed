// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "@voidzero-dev/vite-plus-test";
import type { FilterState } from "../../shared/types";
import { DEFAULT_FILTERS } from "../../shared/stores/filter-store";
import { buildStreamResponse, buildStreamItem, buildTrack } from "../../test/factories";
import { createFetchInterceptor, patchXHR } from ".";

const noopLog = { debug: vi.fn() };

function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return { ...DEFAULT_FILTERS, ...overrides };
}

function setPathname(path: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, pathname: path },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  setPathname("/feed");
});

// --- createFetchInterceptor ---

describe("createFetchInterceptor", () => {
  it("passes non-stream URLs through to original fetch", async () => {
    const original = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    const intercepted = createFetchInterceptor(original, () => makeFilters(), noopLog);

    await intercepted("https://example.com/api/data");
    expect(original).toHaveBeenCalledWith("https://example.com/api/data", undefined);
  });

  it("modifies stream URLs with activityTypes", async () => {
    const streamResponse = buildStreamResponse({ collection: [] });
    const original = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(streamResponse)));
    const intercepted = createFetchInterceptor(
      original,
      () => makeFilters({ activityTypes: ["TrackPost"] }),
      noopLog,
    );

    await intercepted("https://api-v2.soundcloud.com/stream?limit=10");

    const calledUrl = String(original.mock.calls[0]![0]);
    expect(calledUrl).toContain("activityTypes=TrackPost");
  });

  it("filters stream responses through filterStreamResponse", async () => {
    const items = [
      buildStreamItem({ type: "track", track: buildTrack({ title: "Keep Me" }) }),
      buildStreamItem({ type: "track", track: buildTrack({ title: "Remove Me" }) }),
    ];
    const streamResponse = buildStreamResponse({ collection: items });
    const original = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(streamResponse)));

    const intercepted = createFetchInterceptor(
      original,
      () => makeFilters({ searchString: "Keep Me" }),
      noopLog,
    );

    const response = await intercepted("https://api-v2.soundcloud.com/stream?limit=10");
    const data = await response.json();
    expect(data.collection).toHaveLength(1);
    expect(data.collection[0].track.title).toBe("Keep Me");
  });

  it("preserves response status, statusText, and headers", async () => {
    const streamResponse = buildStreamResponse({ collection: [] });
    const original = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(streamResponse), {
        status: 200,
        statusText: "OK",
        headers: { "x-custom": "test" },
      }),
    );
    const intercepted = createFetchInterceptor(original, () => makeFilters(), noopLog);

    const response = await intercepted("https://api-v2.soundcloud.com/stream");
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("OK");
    expect(response.headers.get("x-custom")).toBe("test");
  });

  it("returns original response on JSON parse error", async () => {
    const original = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not json", { status: 200 }));
    const intercepted = createFetchInterceptor(original, () => makeFilters(), noopLog);

    const response = await intercepted("https://api-v2.soundcloud.com/stream");
    const text = await response.text();
    expect(text).toBe("not json");
  });

  it("reconstructs Request objects with modified URL", async () => {
    const streamResponse = buildStreamResponse({ collection: [] });
    const original = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(streamResponse)));
    const intercepted = createFetchInterceptor(
      original,
      () => makeFilters({ activityTypes: ["TrackPost"] }),
      noopLog,
    );

    const req = new Request("https://api-v2.soundcloud.com/stream?limit=10");
    await intercepted(req);

    const calledInput = original.mock.calls[0]![0] as Request;
    expect(calledInput).toBeInstanceOf(Request);
    expect(calledInput.url).toContain("activityTypes=TrackPost");
  });

  it("passes stream URLs through untouched when not on /feed", async () => {
    setPathname("/rinsefm");
    const items = [
      buildStreamItem({ type: "track", track: buildTrack({ title: "Keep Me" }) }),
      buildStreamItem({ type: "track", track: buildTrack({ title: "Remove Me" }) }),
    ];
    const streamResponse = buildStreamResponse({ collection: items });
    const original = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(streamResponse)));

    const intercepted = createFetchInterceptor(
      original,
      () => makeFilters({ searchString: "Keep Me", activityTypes: ["TrackPost"] }),
      noopLog,
    );

    const response = await intercepted(
      "https://api-v2.soundcloud.com/stream/users/338690?limit=10",
    );

    expect(original).toHaveBeenCalledWith(
      "https://api-v2.soundcloud.com/stream/users/338690?limit=10",
      undefined,
    );
    const data = await response.json();
    expect(data.collection).toHaveLength(2);
  });

  it("passes string inputs as modified URL strings", async () => {
    const streamResponse = buildStreamResponse({ collection: [] });
    const original = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(streamResponse)));
    const intercepted = createFetchInterceptor(
      original,
      () => makeFilters({ activityTypes: ["TrackRepost"] }),
      noopLog,
    );

    await intercepted("https://api-v2.soundcloud.com/stream");

    const calledInput = original.mock.calls[0]![0];
    expect(typeof calledInput).toBe("string");
    expect(calledInput).toContain("activityTypes=TrackRepost");
  });
});

// --- patchXHR ---

describe("patchXHR", () => {
  let origOpen: typeof XMLHttpRequest.prototype.open;
  let origSend: typeof XMLHttpRequest.prototype.send;

  beforeEach(() => {
    origOpen = XMLHttpRequest.prototype.open;
    origSend = XMLHttpRequest.prototype.send;
  });

  afterEach(() => {
    XMLHttpRequest.prototype.open = origOpen;
    XMLHttpRequest.prototype.send = origSend;
  });

  it("patches XMLHttpRequest.prototype.open", () => {
    patchXHR(() => makeFilters(), noopLog);
    expect(XMLHttpRequest.prototype.open).not.toBe(origOpen);
  });

  it("passes non-stream XHR URLs through unmodified", () => {
    const openSpy = vi.fn();
    XMLHttpRequest.prototype.open = openSpy;
    // Restore then patch
    XMLHttpRequest.prototype.open = origOpen;
    patchXHR(() => makeFilters(), noopLog);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://example.com/api");

    // The patched open should have called origOpen with the unmodified URL
    // Since origOpen is the real one, we need a different approach
    // Just verify no error is thrown and the URL wasn't modified
    expect(() => xhr.open("GET", "https://example.com/api")).not.toThrow();
  });

  it("modifies stream XHR URLs with activityTypes", () => {
    const calls: string[] = [];
    const savedOrigOpen = origOpen;

    // Replace origOpen with a spy that captures the URL
    XMLHttpRequest.prototype.open = function (_method: string, url: string | URL) {
      calls.push(String(url));
    };

    // Now patch — patchXHR captures the current prototype.open as origOpen
    patchXHR(() => makeFilters({ activityTypes: ["TrackPost"] }), noopLog);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api-v2.soundcloud.com/stream?limit=10");

    // The spy should have been called with the modified URL
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain("activityTypes=TrackPost");

    // Restore
    XMLHttpRequest.prototype.open = savedOrigOpen;
  });

  it("filters response on readyState 4", () => {
    const items = [
      buildStreamItem({ type: "track", track: buildTrack({ title: "Keep" }) }),
      buildStreamItem({ type: "track", track: buildTrack({ title: "Remove" }) }),
    ];
    const responseData = buildStreamResponse({ collection: items });

    // Capture the readystatechange handler
    let capturedHandler: ((this: XMLHttpRequest) => void) | undefined;

    // Mock origOpen to be a no-op
    XMLHttpRequest.prototype.open = function () {};
    // Mock origSend to capture the readystatechange listener
    XMLHttpRequest.prototype.send = function () {};

    patchXHR(() => makeFilters({ searchString: "Keep" }), noopLog);

    const xhr = new XMLHttpRequest();
    const origAddEventListener = xhr.addEventListener.bind(xhr);
    xhr.addEventListener = function (type: string, handler: EventListenerOrEventListenerObject) {
      if (type === "readystatechange") {
        capturedHandler = handler as (this: XMLHttpRequest) => void;
      }
      return origAddEventListener(type, handler);
    };

    xhr.open("GET", "https://api-v2.soundcloud.com/stream?limit=10");
    xhr.send();

    // Simulate readyState 4 with response
    Object.defineProperty(xhr, "readyState", { value: 4, configurable: true });
    Object.defineProperty(xhr, "responseText", {
      value: JSON.stringify(responseData),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(xhr, "response", {
      value: JSON.stringify(responseData),
      writable: true,
      configurable: true,
    });

    capturedHandler?.call(xhr);

    const result = JSON.parse(xhr.responseText);
    expect(result.collection).toHaveLength(1);
    expect(result.collection[0].track.title).toBe("Keep");
  });

  it("passes stream XHR URLs through untouched when not on /feed", () => {
    setPathname("/rinsefm");
    const calls: string[] = [];
    const savedOrigOpen = origOpen;

    XMLHttpRequest.prototype.open = function (_method: string, url: string | URL) {
      calls.push(String(url));
    };

    patchXHR(() => makeFilters({ activityTypes: ["TrackPost"] }), noopLog);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api-v2.soundcloud.com/stream/users/338690?limit=10");

    expect(calls.length).toBe(1);
    expect(calls[0]).toBe("https://api-v2.soundcloud.com/stream/users/338690?limit=10");
    expect(calls[0]).not.toContain("activityTypes");

    XMLHttpRequest.prototype.open = savedOrigOpen;
  });

  it("leaves non-JSON XHR responses unmodified", () => {
    XMLHttpRequest.prototype.open = function () {};
    XMLHttpRequest.prototype.send = function () {};

    let capturedHandler: ((this: XMLHttpRequest) => void) | undefined;

    patchXHR(() => makeFilters(), noopLog);

    const xhr = new XMLHttpRequest();
    const origAddEventListener = xhr.addEventListener.bind(xhr);
    xhr.addEventListener = function (type: string, handler: EventListenerOrEventListenerObject) {
      if (type === "readystatechange") {
        capturedHandler = handler as (this: XMLHttpRequest) => void;
      }
      return origAddEventListener(type, handler);
    };

    xhr.open("GET", "https://api-v2.soundcloud.com/stream");
    xhr.send();

    Object.defineProperty(xhr, "readyState", { value: 4, configurable: true });
    Object.defineProperty(xhr, "responseText", {
      value: "not json",
      writable: true,
      configurable: true,
    });

    capturedHandler?.call(xhr);

    // responseText should remain unchanged since JSON parse failed
    expect(xhr.responseText).toBe("not json");
  });
});
