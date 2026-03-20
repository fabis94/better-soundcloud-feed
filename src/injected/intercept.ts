import type { SCStreamResponse, FilterState } from "../shared/types";
import { filterStreamResponse } from "../shared/filters";
import { isStreamUrl, extractUrl, withActivityTypes } from "../shared/url";

interface Logger {
  debug: (msg: string, props?: Record<string, unknown>) => void;
}

interface InterceptedXHR extends XMLHttpRequest {
  _interceptUrl?: string;
}

const INTERCEPT_RE = /api-v2\.soundcloud\.com\/(stream|feed)/;

export function createFetchInterceptor(
  originalFetch: typeof window.fetch,
  getFilters: () => FilterState,
  log: Logger,
): typeof window.fetch {
  return async function (this: unknown, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = extractUrl(input);

    if (!isStreamUrl(url)) {
      return originalFetch.apply(this, [input, init]);
    }

    const filters = getFilters();
    const modifiedUrl = withActivityTypes(url, filters.activityTypes);
    log.debug("fetch intercepted", { originalUrl: url, modifiedUrl, filters });

    const modifiedInput = input instanceof Request ? new Request(modifiedUrl, input) : modifiedUrl;

    const response = await originalFetch.call(this as typeof globalThis, modifiedInput, init);
    const clone = response.clone();

    let data: SCStreamResponse;
    try {
      data = await clone.json();
    } catch {
      return response;
    }

    const filtered = filterStreamResponse(data, filters);
    const beforeCount = data.collection?.length ?? 0;
    const afterCount = filtered.collection?.length ?? 0;
    log.debug("response filtered", { beforeCount, afterCount, removed: beforeCount - afterCount });

    return new Response(JSON.stringify(filtered), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

export function patchXHR(
  getFilters: () => FilterState,
  log: Logger,
): void {
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

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

    const filters = getFilters();
    const isIntercepted = INTERCEPT_RE.test(urlStr);
    const finalUrl = isIntercepted
      ? withActivityTypes(urlStr, filters.activityTypes)
      : urlStr;

    if (isIntercepted) {
      log.debug("XHR intercepted", {
        originalUrl: urlStr,
        modifiedUrl: finalUrl,
        filters,
      });
    }

    return origOpen.call(this, method, finalUrl, async ?? true, username ?? null, password ?? null);
  };

  XMLHttpRequest.prototype.send = function (
    this: InterceptedXHR,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    if (this._interceptUrl && INTERCEPT_RE.test(this._interceptUrl)) {
      const filters = getFilters();
      this.addEventListener("readystatechange", function (this: InterceptedXHR) {
        if (this.readyState === 4) {
          try {
            const data = JSON.parse(this.responseText) as SCStreamResponse;
            const filtered = filterStreamResponse(data, filters);
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
}
