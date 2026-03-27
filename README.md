<p align="center">
  <img src="public/icon.svg" width="128" height="128" alt="Better SoundCloud Feed">
</p>

# Better SoundCloud Feed

Chrome/Edge/Firefox extension (Manifest V3) that filters your SoundCloud feed. Intercepts `api-v2.soundcloud.com/stream` API calls and filters items from the response before SoundCloud renders them.

## Quick start

```bash
pnpm install
pnpm build
```

Then load the extension in your browser:

**Chrome/Edge:**

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `dist/manifest.json`

Navigate to [soundcloud.com](https://soundcloud.com/) — a filter bar appears above your feed.

## Development

```bash
pnpm dev          # Build in watch mode
pnpm build        # Production build
pnpm test         # Unit tests (Vitest)
pnpm check        # Lint (Oxlint) + format check (Oxfmt)
pnpm typecheck    # TypeScript strict mode
```

After rebuilds, reload the extension in the browser to pick up changes.

## Filters

| Filter                | Behavior                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Activity types**    | Checkboxes for track posts, track reposts, and playlist posts. Controls the `activityTypes` query param at the API level — unchecked types are never fetched. |
| **Search (simple)**   | Single input matching against all fields (title, description, genre, artist, label).                                                                          |
| **Search (extended)** | Per-field inputs: title, description, genre, artist, label. Only non-empty fields are checked.                                                                |
| **Search syntax**     | Comma-separated terms, `-exclude` prefix, `*wildcard` globs, case-insensitive. AND/OR operator toggle.                                                        |
| **Duration**          | Min/max in minutes. Applies to tracks only (not playlist totals).                                                                                             |

Filters are persisted in `chrome.storage.local` and mirrored to `localStorage` for sync access from the page context. Changes only take effect when the user clicks **Apply** or **Apply & Reload**.

## How it works

Browser extensions enforce two separate JavaScript environments:

- **Content script** (`src/content-script/`) runs in an **isolated world** — it can access `chrome.*` extension APIs and the page DOM, but has its own `window` object separate from the page's.
- **Injected script** (`src/injected/`) runs in the **page context (main world)** — the same environment as SoundCloud's code, so it can patch `window.fetch` and `XMLHttpRequest`, but cannot access extension APIs.

Intercepting API responses requires patching the page's `fetch`/`XHR`, which only works from the main world. Persisting filter settings requires `chrome.storage.local`, which only works from the isolated world. The two scripts communicate over `window.postMessage` since the DOM is the one thing both worlds share.

The flow:

1. The content script injects `injected.js` into the page context via a `<script>` tag
2. `injected.js` monkey-patches `window.fetch` and `XMLHttpRequest`
3. API responses from `/stream` and `/feed` endpoints are intercepted, filtered, and returned to SoundCloud's JS
4. The content script and injected script communicate via `window.postMessage`
5. A MutationObserver watches for SPA route changes and injects the filter UI when the feed page loads

## Project structure

```
src/
├── content-script/     # UI injection, chrome.storage, DOM interaction
│   ├── index.ts        # Entry: injects page script, mounts filter UI, bridges messages
│   ├── filter-bar.ts   # Filter bar creation, read/restore state, event wiring
│   └── help-modal.ts   # Help dialog
├── injected/           # Runs in page context (main world)
│   ├── index.ts        # Entry: fetch/XHR patching, message listener
│   └── intercept.ts    # Fetch and XHR interception + response filtering
├── shared/             # Shared between both entry points
│   ├── types.ts        # SC API types (PartialDeep), filter state, message protocol
│   ├── filters.ts      # Pure filter logic (matchesFilters, filterStreamResponse)
│   ├── search.ts       # Search string parsing, field extractors
│   ├── storage.ts      # chrome.storage.local + localStorage sync
│   ├── url.ts          # URL helpers (isStreamUrl, extractUrl, withActivityTypes)
│   └── logger.ts       # LogTape configuration
└── test/
    └── factories.ts    # Typed factory functions for test fixtures
```

## License

[MIT](LICENSE)
