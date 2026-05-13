import type { SCStreamResponse, FilterState } from "../../shared/types";
import { filterStreamResponse } from "../../shared/utils/filters";
import { isStreamUrl, extractUrl, withActivityTypes, isFeedPage } from "../../shared/utils/url";

interface Logger {
  debug: (msg: string, props?: Record<string, unknown>) => void;
}

interface InterceptedXHR extends XMLHttpRequest {
  _interceptUrl?: string;
}

export function createFetchInterceptor(
  originalFetch: typeof window.fetch,
  getFilters: () => FilterState,
  log: Logger,
): typeof window.fetch {
  return async function (
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = extractUrl(input);

    if (!isStreamUrl(url) || !isFeedPage()) {
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

function filterXHRResponse(xhr: InterceptedXHR, filters: FilterState, log: Logger): void {
  if (xhr.readyState !== 4) return;
  try {
    const data = JSON.parse(xhr.responseText) as SCStreamResponse;
    const filtered = filterStreamResponse(data, filters);
    const beforeCount = data.collection?.length ?? 0;
    const afterCount = filtered.collection?.length ?? 0;
    log.debug("XHR response filtered", {
      beforeCount,
      afterCount,
      removed: beforeCount - afterCount,
    });
    Object.defineProperty(xhr, "responseText", { value: JSON.stringify(filtered) });
    Object.defineProperty(xhr, "response", { value: JSON.stringify(filtered) });
  } catch {
    // non-JSON response, skip
  }
}

export function patchXHR(getFilters: () => FilterState, log: Logger): void {
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
    const isIntercepted = isStreamUrl(urlStr) && isFeedPage();
    const finalUrl = isIntercepted ? withActivityTypes(urlStr, filters.activityTypes) : urlStr;

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
    if (this._interceptUrl && isStreamUrl(this._interceptUrl) && isFeedPage()) {
      const filters = getFilters();
      this.addEventListener("readystatechange", function (this: InterceptedXHR) {
        filterXHRResponse(this, filters, log);
      });
    }
    return origSend.call(this, body);
  };
}
