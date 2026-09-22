---
name: inspect-sc-api
description: >
  Inspect SoundCloud's live API calls, responses and page state through the Chrome DevTools MCP:
  probe endpoints and params from a soundcloud.com tab, capture request/response bodies, grep SC's
  JS bundles for supported options, and read the extension's own state (filter bar DOM, localStorage,
  window.scPlayer). Use when adding or verifying a filter or page kind, or debugging interception.
argumentHint: "[page or endpoint to inspect, e.g. /tags/<tag>/popular-tracks]"
---

# Inspect SoundCloud API & page state

Needs the `chrome-devtools` MCP server (part of this repo's AI config) attached to the user's Chrome with a logged-in soundcloud.com session. Probe *from a soundcloud.com tab* with `evaluate_script`: cookies, CORS and `client_id` then come for free. Page kinds, endpoints and verified facts are in <%= instructionPath('filter-pages') %> — update it with what you learn.

## Ground rules

- Open your own **background tab** (`new_page`, `background: true`) rather than working in the user's tab; `close_page` it when done. If you must use the user's tab, restore its URL, theme and any state afterwards.
- `chrome://` URLs are blocked: the user reloads the unpacked extension themselves after `pnpm build`. Ask, then confirm the new build is live (new `#scf-*` ids, `localStorage` keys).
- Navigation clears the network log (`list_network_requests` = since the last navigation). Capture bodies before navigating.
- Clean up any `bscf_*` localStorage state you wrote (`bscf_filters`, `bscf_filters_tags`, `bscf_ui`, `bscf_settings`).
- Never put OAuth tokens or `client_id` values into docs, commits or user-facing messages.

## 1. Find the requests

- `list_pages` → `select_page`/`new_page`. `list_network_requests` with `resourceTypes: ["xhr", "fetch"]` shows SC's `api-v2.soundcloud.com/...` calls. `get_network_request` (by `reqid`) gives the full URL, request headers (incl. `authorization`), response headers and body (`responseFilePath` for big bodies, then parse with python).
- For a page that already loaded: `performance.getEntriesByType("resource")` in `evaluate_script` lists every URL fetched, including `client_id` and `app_version`.

## 2. Probe an endpoint from the page

```js
async () => {
  const cid = new URL(
    performance.getEntriesByType("resource").map((e) => e.name).find((u) => u.includes("client_id=")),
  ).searchParams.get("client_id");
  const probe = async (path, params, headers = {}) => {
    const u = new URL("https://api-v2.soundcloud.com" + path);
    for (const [k, v] of Object.entries({ client_id: cid, app_locale: "en", linked_partitioning: 1, ...params }))
      u.searchParams.set(k, v);
    const r = await fetch(u, { credentials: "include", headers });
    const text = await r.text(); // read once; .json() then .text() throws
    let body = null; try { body = JSON.parse(text); } catch {}
    return { status: r.status, len: body?.collection?.length, total: body?.total_results,
      ids: body?.collection?.map((t) => t.id), next: body?.next_href?.replace(cid, "CID"),
      raw: body ? undefined : text.slice(0, 200) };
  };
  return {
    base: await probe("/recent-tracks/speed%20garage", { limit: 5 }),
    withParam: await probe("/recent-tracks/speed%20garage", { limit: 5, "filter.created_at": "last_day" }),
  };
}
```

- SC never rejects unknown params: **identical ids with and without the param ⇒ ignored**. Test `limit` boundaries too (HTTP 400 = over the cap) and check what `next_href` echoes.
- `/stream` and other user-scoped endpoints return 401 without `Authorization: OAuth …`; copy the value from a `get_network_request` on the page and pass it in `headers`. On `/feed` the extension's own interceptor patches `fetch`/XHR, so probe `/stream` from a non-feed tab (e.g. a tag page) to bypass it.

## 3. Enumerate what SC's client supports

SC's webpack bundles (`*.js` on `a-v2.sndcdn.com`) are fetchable from the page — grep them for param names to find option lists, API resource paths and routes:

```js
async () => {
  const needles = ['apiName:"filter.created_at"', 'path:"recent-tracks', '"popular-tracks"', 'path:"stream"'];
  const hits = [];
  for (const u of performance.getEntriesByType("resource").map((e) => e.name).filter((u) => /sndcdn.*\.js/.test(u))) {
    const t = await (await fetch(u)).text();
    for (const n of needles) { const i = t.indexOf(n); if (i >= 0) hits.push({ file: u.split("/").pop(), n, ctx: t.slice(i - 400, i + 800) }); }
  }
  return hits;
}
```

Known anchors: search filter values sit next to `apiName:"filter.created_at"`; API resources next to `recentTracks:{...path:"recent-tracks/:tag"}` / `searchCategory` / `stream`; the tag router next to `["recent-tracks","popular-tracks","playlists"]`; the feed's activity filter model next to `activityTypes:["TrackPost","TrackRepost","PlaylistPost"]`.

## 4. Inspect page and extension state

`evaluate_script` runs in the page (main) world, so both SC's globals and the injected script's are visible:

- **SC**: `location.pathname` (percent-encoded), `document.body.className` (`theme-dark` / `theme-light`), list containers (`.stream__list`, `.tagsMain .tabs__contentSlot`, `.tagsList__list .soundList__item`), `window.scPlayer` / `window.scSocialActions` (discovered by the injected script), SC's CSS variables via `getComputedStyle(document.body).getPropertyValue("--surface-color")`.
- **Extension**: `#sc-feed-filter-bar` (`data-store-key`, `#scf-*` inputs), `localStorage.bscf_filters` / `bscf_filters_tags` / `bscf_ui` / `bscf_settings`, `document.documentElement.dataset` (`scfPlayerReady`, `scfPipSupported`).
- **SPA behaviour**: stamp nodes (`el.dataset.mark = "x"`), click a tab link (`a.tabs__tab`), wait ~2 s, and see which nodes were re-created — that is how bar anchors that survive navigation are chosen.
- **Drive the bar like a user**: set `input.value`, dispatch `new Event("input", { bubbles: true })`, click `#scf-apply-reload`; then compare the request URLs (`limit`, `filter.*`) from `list_network_requests` and the rendered item count against the original body from `get_network_request`.
- `take_screenshot` for visual checks; toggle SC's theme class on `body` to preview both themes, then restore it.

## 5. Record what you learned

Put verified facts (honoured/ignored params, caps, response shapes, anchors) into <%= instructionPath('filter-pages') %> and, if the architecture changed, the repo guide — via the `update-documentation` skill, then `pnpm uac generate`.
