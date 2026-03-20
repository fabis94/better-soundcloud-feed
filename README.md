# SoundCloud Feed Filter

Chrome/Edge extension (MV3) that filters your SoundCloud feed by content type, artist, and genre/tags. Intercepts `api-v2.soundcloud.com/stream` API calls and strips items from the response before SoundCloud renders them.

## Quick start

```bash
pnpm install
pnpm build
```

Then load the extension in your browser:

1. Open `edge://extensions` (or `chrome://extensions`)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder

Navigate to [soundcloud.com](https://soundcloud.com/) — a filter bar appears above your feed.

## Development

```bash
pnpm dev          # Build in watch mode — rebuild on save
pnpm test         # Run unit tests (Vitest)
pnpm check        # Type check + lint (Oxlint)
pnpm fmt          # Format (Oxfmt)
```

After `pnpm dev` rebuilds, reload the extension in `edge://extensions` to pick up changes.

## Filters

| Filter | Behavior |
|---|---|
| **Content type** | Checkboxes to show/hide tracks, track reposts, playlists, playlist reposts |
| **Exclude artists** | Comma-separated permalinks — hides items by artist or reposter |
| **Genre/tag whitelist** | Comma-separated terms — if any specified, only shows items matching at least one (case-insensitive substring match against `genre` and `tag_list`) |

Filter state persists via `chrome.storage.local`.

## How it works

1. A content script injects `injected.js` into the page context at `document_start`
2. `injected.js` monkey-patches `window.fetch` (and `XMLHttpRequest` as fallback)
3. API responses from `/stream` and `/feed` endpoints are intercepted, filtered through pure functions, and returned to SoundCloud's JS
4. A MutationObserver watches for SPA route changes and injects the filter UI when the feed page loads

## Project structure

```
src/
├── types.ts            SC API shapes, filter state, message types
├── filters.ts          Pure filter logic (matchesFilters, filterStreamResponse)
├── filters.test.ts     Filter tests
├── storage.ts          Typed chrome.storage.local wrapper (injectable backend)
├── storage.test.ts     Storage tests
├── url.ts              URL helpers (isStreamUrl, extractUrl, withLimit)
├── url.test.ts         URL tests
├── test-factories.ts   Typed factory functions for test fixtures
├── content-script.ts   Entry: injects page script, mounts filter UI, bridges messages
├── injected.ts         Entry: page-context fetch/XHR patch
└── filter-ui.css       Filter bar styles
```
