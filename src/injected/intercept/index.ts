import type { FilterState } from "../../shared/types";
import type { PageKind } from "../../shared/pages";
import { extractUrl } from "../../shared/utils/url";
import { resolveInterceptTarget, type CollectionLike, type InterceptTarget } from "./targets";

interface Logger {
  debug: (msg: string, props?: Record<string, unknown>) => void;
}

/** Returns the current filters for the page kind a request belongs to. */
export type GetFilters = (kind: PageKind) => FilterState;

interface InterceptedXHR extends XMLHttpRequest {
  _interceptTarget?: InterceptTarget;
}

function applyResponseFilter(
  target: InterceptTarget,
  data: CollectionLike,
  filters: FilterState,
  log: Logger,
  label: string,
): CollectionLike {
  const filtered = target.filterResponse(data, filters);
  const beforeCount = data.collection?.length ?? 0;
  const afterCount = filtered.collection?.length ?? 0;
  log.debug(`${label} response filtered`, {
    page: target.kind,
    beforeCount,
    afterCount,
    removed: beforeCount - afterCount,
  });
  return filtered;
}

export function createFetchInterceptor(
  originalFetch: typeof window.fetch,
  getFilters: GetFilters,
  log: Logger,
): typeof window.fetch {
  return async function (
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = extractUrl(input);
    const target = resolveInterceptTarget(url, location.pathname);

    if (!target) {
      return originalFetch.apply(this, [input, init]);
    }

    const filters = getFilters(target.kind);
    const modifiedUrl = target.buildRequestUrl(url, filters);
    log.debug("fetch intercepted", { page: target.kind, originalUrl: url, modifiedUrl, filters });

    const modifiedInput = input instanceof Request ? new Request(modifiedUrl, input) : modifiedUrl;

    const response = await originalFetch.call(this as typeof globalThis, modifiedInput, init);
    const clone = response.clone();

    let data: CollectionLike;
    try {
      data = await clone.json();
    } catch {
      return response;
    }

    const filtered = applyResponseFilter(target, data, filters, log, "fetch");

    return new Response(JSON.stringify(filtered), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

function filterXHRResponse(
  xhr: InterceptedXHR,
  target: InterceptTarget,
  filters: FilterState,
  log: Logger,
): void {
  if (xhr.readyState !== 4) return;
  try {
    const data = JSON.parse(xhr.responseText) as CollectionLike;
    const filtered = JSON.stringify(applyResponseFilter(target, data, filters, log, "XHR"));
    Object.defineProperty(xhr, "responseText", { value: filtered });
    Object.defineProperty(xhr, "response", { value: filtered });
  } catch {
    // non-JSON response, skip
  }
}

export function patchXHR(getFilters: GetFilters, log: Logger): void {
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
    // Resolved once here and reused by send(): the pathname could change in between.
    const target = resolveInterceptTarget(urlStr, location.pathname);
    this._interceptTarget = target ?? undefined;

    let finalUrl = urlStr;
    if (target) {
      finalUrl = target.buildRequestUrl(urlStr, getFilters(target.kind));
      log.debug("XHR intercepted", {
        page: target.kind,
        originalUrl: urlStr,
        modifiedUrl: finalUrl,
      });
    }

    return origOpen.call(this, method, finalUrl, async ?? true, username ?? null, password ?? null);
  };

  XMLHttpRequest.prototype.send = function (
    this: InterceptedXHR,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const target = this._interceptTarget;
    if (target) {
      const filters = getFilters(target.kind);
      this.addEventListener("readystatechange", function (this: InterceptedXHR) {
        filterXHRResponse(this, target, filters, log);
      });
    }
    return origSend.call(this, body);
  };
}
