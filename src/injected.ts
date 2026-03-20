import type { SCStreamResponse, FilterState, BridgeMessage } from './types';
import { filterStreamResponse } from './filters';
import { isStreamUrl, extractUrl } from './url';

(function () {
  const originalFetch = window.fetch;

  let currentFilters: FilterState = {
    types: ['track', 'track-repost', 'playlist', 'playlist-repost'],
    excludeArtists: [],
    genres: [],
  };

  window.addEventListener('message', (e: MessageEvent<BridgeMessage>) => {
    if (e.source !== window || e.data?.type !== 'SC_FILTER_UPDATE') return;
    currentFilters = e.data.filters;
  });

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = extractUrl(input);

    if (!isStreamUrl(url)) {
      return originalFetch.apply(this, [input, init]);
    }

    const response = await originalFetch.call(this, input, init);
    const clone = response.clone();

    let data: SCStreamResponse;
    try {
      data = await clone.json();
    } catch {
      return response;
    }

    const filtered = filterStreamResponse(data, currentFilters);

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
    ...rest: [boolean?, string?, string?]
  ) {
    this._interceptUrl = String(url);
    return origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (
    this: InterceptedXHR,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    if (this._interceptUrl && INTERCEPT_RE.test(this._interceptUrl)) {
      this.addEventListener('readystatechange', function (this: InterceptedXHR) {
        if (this.readyState === 4) {
          try {
            const filtered = filterStreamResponse(
              JSON.parse(this.responseText) as SCStreamResponse,
              currentFilters,
            );
            Object.defineProperty(this, 'responseText', { value: JSON.stringify(filtered) });
            Object.defineProperty(this, 'response', { value: JSON.stringify(filtered) });
          } catch {
            // non-JSON response, skip
          }
        }
      });
    }
    return origSend.call(this, body);
  };

  // Signal readiness
  window.postMessage({ type: 'SC_FILTER_READY' }, '*');
})();
