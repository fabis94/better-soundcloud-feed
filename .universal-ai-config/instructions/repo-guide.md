---
description: Core project architecture, conventions, and constraints for the SoundCloud Feed Filter browser extension
alwaysApply: true
---

# SoundCloud Feed Filter — Repo Guide

Manifest V3 browser extension (Chrome/Edge/Firefox) that filters SoundCloud's `/feed` page by intercepting `api-v2.soundcloud.com/stream` API calls.

## Architecture

Two entry points, each built as separate IIFE bundles via Vite Environments API:

- **Content script** (`src/content-script/`) — runs in isolated world. Injects filter UI into the feed page DOM, manages `chrome.storage.local` persistence, and injects `injected.js` into the page context via `<script>` tag.
- **Injected script** (`src/injected/`) — runs in page context (main world). Monkey-patches `window.fetch` and `XMLHttpRequest` to intercept and filter SC API responses before SC renders them.

Communication between the two: `window.postMessage` bridge (`SC_FILTER_UPDATE` / `SC_FILTER_READY` message types).

Shared code lives in `src/shared/` — types, filter logic, search parsing, URL helpers, storage, logging.

## Key Constraints

- **SC API types are `PartialDeep`**. SoundCloud's API is undocumented and can change without notice — fields may be added, removed, renamed, or change type at any time. Raw types (`SCRaw*`) are internal; exported types use `PartialDeep` from type-fest. Always use `?.` when accessing SC data fields. Never assume a field exists or has a specific shape. Code must gracefully handle missing/malformed data — skip items with broken fields rather than crashing the entire filter pipeline.
- **IIFE output only**. Content scripts cannot use ES modules. Both entries build as IIFE via Vite Environments API with `consumer: "client"` on the injected environment to bundle node_modules.
- **No top-level await**. Content scripts don't support it. LogTape uses `configureSync`.
- **SC CSS variables for theming**. Never use hardcoded colors in `filter-ui.css`. Use SoundCloud's own CSS variables (see docblock in that file) for light/dark theme support.
- **Explicit apply workflow**. Filters are only persisted and sent to the injected script when the user clicks Apply or Apply & Reload. UI-only changes (mode toggle, operator pill) don't auto-apply.
- **localStorage persistence**. Filters are stored directly in `localStorage` via `filterStorage.load()` / `filterStorage.save()`, so both the content script and injected script (page context) can access them synchronously.
- **SC uses comma-separated `activityTypes` query param**, not repeated params. `withActivityTypes()` joins values with commas into a single `activityTypes=` param.
- **Cross-browser compatibility**. Code must use `chrome.*` APIs only (not `browser.*`), since `chrome.*` is the common MV3 namespace supported by Chrome, Edge, and Firefox. No browser-specific APIs or polyfills.

## Build & Dev

Package manager: **pnpm**. Build tool: **vite-plus** (wraps Vite 8 + Rolldown + Oxc).

```
pnpm dev          # watch mode build
pnpm build        # production build
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
```

Output goes to `dist/`. Load `dist/` as an unpacked extension in the browser (Chrome/Edge: `Load unpacked`; Firefox: `about:debugging` → Load Temporary Add-on). No hot reload — manually reload the extension after rebuilds.

## Filter System

### Activity types
Controlled at request level — `activityTypes` query param is set on outgoing SC API requests. Values defined in `SCActivityType` const object (single source of truth). Derive labels with `formatActivityType()` (camelCase → "Camel case").

### Search
Two modes: **simple** (single input, matches all searchable text) and **extended** (per-field: title, description, genre, artist, label). Both support:
- Comma-delimited terms
- `-exclude` prefix to reject matches
- `*wildcard` glob patterns
- AND/OR operator toggle (applies to both modes)

### Duration
Min/max in minutes (UI) → stored as seconds → compared against `track.duration` (milliseconds). Tracks only.

### Playlist filtering
A playlist passes if the playlist metadata itself OR any individual track within it matches search + duration filters.

## Directory Structure

```
src/
  content-script/   # UI injection, chrome.storage, DOM interaction
  injected/         # fetch/XHR monkey-patching, response filtering
  shared/           # types, filters, search, url, storage, logger
  test/             # test setup, factories
```

Tests are colocated with the files they test (e.g., `filters.test.ts` next to `filters.ts`).

## Conventions

- `SCActivityType` const object is the single source of truth for activity types. Derive arrays via `Object.values()`, labels via `formatActivityType()`. No separate label maps or arrays.
- Keep content script `index.ts` lean — extract complex features (help modal, etc.) into separate files in the same directory.
- MutationObserver runs without debounce. `injectFilterUI()` short-circuits via `getElementById` when bar exists, keeping per-mutation cost negligible.
- Test factories use `Partial<T>` overrides. `buildStreamResponse` is the exception — it uses `Record<string, unknown>` with an `as` cast to work around `PartialDeep` type complexity at the top-level response type.
