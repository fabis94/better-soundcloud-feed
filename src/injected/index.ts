import type { SCStreamResponse, FilterState, BridgeMessage } from "../shared/types";
import { filterStreamResponse } from "../shared/filters";
import { isStreamUrl, extractUrl, withActivityTypes } from "../shared/url";
import { loadFiltersSync } from "../shared/storage";
import { createLogger } from "../shared/logger";

const log = createLogger("injected");

(function () {
  const originalFetch = window.fetch;

  let currentFilters: FilterState = loadFiltersSync();
  log.debug("Initial filters loaded from localStorage", { filters: currentFilters });

  window.addEventListener("message", (e: MessageEvent<BridgeMessage>) => {
    if (e.source !== window || e.data?.type !== "SC_FILTER_UPDATE") return;
    currentFilters = e.data.filters;
    log.debug("Filters updated via message", { filters: currentFilters });
  });

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = extractUrl(input);

    if (!isStreamUrl(url)) {
      return originalFetch.apply(this, [input, init]);
    }

    // Apply activity type filter at request level
    const modifiedUrl = withActivityTypes(url, currentFilters.activityTypes);
    log.debug("fetch intercepted", { originalUrl: url, modifiedUrl, filters: currentFilters });

    const modifiedInput = input instanceof Request ? new Request(modifiedUrl, input) : modifiedUrl;

    const response = await originalFetch.call(this, modifiedInput, init);
    const clone = response.clone();

    let data: SCStreamResponse;
    try {
      data = await clone.json();
    } catch {
      return response;
    }

    // Apply response-level filters (search, duration)
    const filtered = filterStreamResponse(data, currentFilters);
    const beforeCount = data.collection?.length ?? 0;
    const afterCount = filtered.collection?.length ?? 0;
    log.debug("response filtered", { beforeCount, afterCount, removed: beforeCount - afterCount });

    return new Response(JSON.stringify(filtered), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };

  // XHR fallback
  const INTERCEPT_RE = /api-v2\.soundcloud\.com\/(stream|feed)/;
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  interface InterceptedXHR extends XMLHttpRequest {
    _interceptUrl?: string;
  }

  XMLHttpRequest.prototype.open = function (
    this: InterceptedXHR,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const urlStr = String(url);
    this._interceptUrl = urlStr;

    // Modify URL for stream/feed requests
    const isIntercepted = INTERCEPT_RE.test(urlStr);
    const finalUrl = isIntercepted
      ? withActivityTypes(urlStr, currentFilters.activityTypes)
      : urlStr;

    if (isIntercepted) {
      log.debug("XHR intercepted", {
        originalUrl: urlStr,
        modifiedUrl: finalUrl,
        filters: currentFilters,
      });
    }

    return origOpen.call(this, method, finalUrl, async ?? true, username ?? null, password ?? null);
  };

  XMLHttpRequest.prototype.send = function (
    this: InterceptedXHR,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    if (this._interceptUrl && INTERCEPT_RE.test(this._interceptUrl)) {
      this.addEventListener("readystatechange", function (this: InterceptedXHR) {
        if (this.readyState === 4) {
          try {
            const data = JSON.parse(this.responseText) as SCStreamResponse;
            const filtered = filterStreamResponse(data, currentFilters);
            const beforeCount = data.collection?.length ?? 0;
            const afterCount = filtered.collection?.length ?? 0;
            log.debug("XHR response filtered", {
              beforeCount,
              afterCount,
              removed: beforeCount - afterCount,
            });
            Object.defineProperty(this, "responseText", { value: JSON.stringify(filtered) });
            Object.defineProperty(this, "response", { value: JSON.stringify(filtered) });
          } catch {
            // non-JSON response, skip
          }
        }
      });
    }
    return origSend.call(this, body);
  };

  // Signal readiness
  window.postMessage({ type: "SC_FILTER_READY" }, "*");
})();
