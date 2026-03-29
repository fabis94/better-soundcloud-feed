---
description: Core project architecture, conventions, and constraints for the SoundCloud Feed Filter browser extension
alwaysApply: true
---

# SoundCloud Feed Filter — Repo Guide

Manifest V3 browser extension (Chrome/Edge/Firefox) that filters SoundCloud's `/feed` page by intercepting `api-v2.soundcloud.com/stream` API calls, and adds extended playback controls via SC's internal player API.

## Architecture

Two entry points, each built as separate IIFE bundles via Vite Environments API:

- **Content script** (`src/content-script/`) — runs in isolated world. UI components are Preact functional components (`.tsx`) with `@preact/signals` for reactivity in `src/content-script/components/`. Injects filter UI into the feed page DOM, injects player controls into SC's player bar, and injects `injected.js` into the page context via `<script>` tag.
- **Injected script** (`src/injected/`) — runs in page context (main world). Monkey-patches `window.fetch` and `XMLHttpRequest` to intercept and filter SC API responses. Discovers SC's internal player API from webpack module cache and handles playback commands.

Communication between the two: `window.postMessage` bridge with typed `BridgeMessage` union (`SC_FILTER_READY`, `SC_PLAYER_READY`, `SC_PLAYER_COMMAND`) and `ReactiveStore` cross-realm sync (`SC_STORE_SYNC`).

Shared code lives in `src/shared/` — modular types (`types/`), reactive store, filter logic, search parsing, URL helpers, logging.

## SC Player API (`scPlayer`)

The injected script discovers SC's internal playback controller from the webpack module cache. It probes via `webpackJsonp.push` with a unique chunk ID per attempt, searching for the module exporting `playCurrent`. This is module-ID independent — works regardless of SC's chunk ordering or minification.

Key details:
- **Discovery is async** — the injected script runs before SC's webpack runtime loads. `discoverPlayer()` polls every 1s until the runtime and player module are available.
- **Assigned to `window.scPlayer`** once found, typed as `SCPlayer` (deeply partial via `PartialDeep`).
- **Content script cannot access `window.scPlayer` directly** (isolated world). It sends `SC_PLAYER_COMMAND` messages; the injected script executes them.
- **Player readiness** is signalled via `SC_PLAYER_READY` message + `document.documentElement.dataset.scfPlayerReady` data attribute (fallback for race conditions).
- `seekCurrentTo` and `seekCurrentBy` take **callback functions** `(sound) => number`, not raw numbers.

## Reactive Store (`ReactiveStore<T>`)

`src/shared/store.ts` provides a generic, type-safe, reactive localStorage-backed store. All persistent state uses this:

- `filterStore` (`src/shared/storage.ts`) — feed filter state, explicit-apply semantics
- `settingsStore` (`src/shared/settings-store.ts`) — extension settings, instant-apply semantics

API: `get()`, `get(key)`, `update(patch)`, `subscribe(fn)`, `reload()`, `isAvailable()`. `subscribe()` returns an unsubscribe function. State is lazy-loaded on first access, merged with defaults.

Creating a new store is one line:
```ts
export const myStore = new ReactiveStore<MyState>("bscf_mystate", MY_DEFAULTS);
```

### Cross-realm sync

Both IIFE bundles (content script + injected script) create their own `ReactiveStore` instances. Since they run in separate JS realms but share the same `localStorage` and `window.postMessage` channel, the store self-syncs:

- `update()` persists to localStorage, notifies local subscribers, then posts `SC_STORE_SYNC` with the store key via `window.postMessage`.
- Each store listens for `SC_STORE_SYNC` messages matching its key. On receipt, it reloads from localStorage and notifies its own subscribers.
- No manual message passing needed for persistent state — just call `update()` in one realm and `subscribe()` in the other.

This is why `SC_FILTER_UPDATE` doesn't exist — filter sync is handled entirely by `filterStore`'s cross-realm reactivity. Use explicit `BridgeMessage` types only for transient actions (commands, readiness signals) that aren't persisted state.

## Key Constraints

- **SC API types are `PartialDeep`**. SoundCloud's API is undocumented and can change without notice. Raw types (`SCRaw*`) are internal; exported types use `PartialDeep` from type-fest. Always use `?.` when accessing SC data fields. Code must gracefully handle missing/malformed data.
- **IIFE output only**. Content scripts cannot use ES modules. Both entries build as IIFE via Vite Environments API with `consumer: "client"` on the injected environment to bundle node_modules.
- **No top-level await**. Content scripts don't support it. LogTape uses `configureSync`.
- **Preact, not Custom Elements**. Content script isolated worlds don't have access to `customElements` API. All UI uses Preact (`render()` into plain DOM nodes) with `@preact/signals` for fine-grained reactivity. No Shadow DOM, no web components. tsconfig requires `"jsx": "react-jsx"` and `"jsxImportSource": "preact"`.
- **Multiple Preact render roots**. Each injection site (filter bar, modals, player buttons) gets its own `render()` call to its own container element. There is no single app root.
- **SC CSS variables for theming**. Never use hardcoded colors in `filter-ui.css`. Use SoundCloud's own CSS variables (see docblock in that file) for light/dark theme support.
- **Explicit apply workflow** for filters. Filters are only persisted and sent to the injected script when the user clicks Apply or Apply & Reload. UI-only changes (mode toggle, operator pill) don't auto-apply.
- **Instant apply for settings**. Extension settings (e.g. skip-forward toggle) take effect immediately via `settingsStore.subscribe()`.
- **localStorage persistence**. Both `filterStore` and `settingsStore` use `localStorage` directly (not `chrome.storage`), so both the content script and injected script (page context) can access them. All keys use the `bscf_` prefix.
- **Cross-browser compatibility**. Code must use `chrome.*` APIs only (not `browser.*`), since `chrome.*` is the common MV3 namespace supported by Chrome, Edge, and Firefox.

## Build & Dev

Package manager: **pnpm**. Build tool: **vite-plus** (wraps Vite 8 + Rolldown + Oxc).

```
pnpm dev          # watch mode build
pnpm build        # production build
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm check        # oxlint + oxfmt
pnpm check:unused # knip (dead code detection)
```

Output goes to `dist/`. Load `dist/` as an unpacked extension in the browser. No hot reload — manually reload the extension after rebuilds.

## Filter System

### Activity types
Controlled at request level — `activityTypes` query param is set on outgoing SC API requests. Values defined in `SCActivityType` const object (single source of truth). Derive labels with `formatActivityType()`.

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

## Icons

SVG icons are stored as `.svg` files and imported via `?raw` suffix (Vite inlines them as strings).

## Directory Structure

```
src/
  content-script/          # UI injection, DOM interaction
    components/            # Preact functional components (.tsx)
      Modal.tsx            # Reusable modal (backdrop, dialog, close)
      HelpModal.tsx        # In-app help content
      SettingsModal.tsx    # Playback settings form
      SettingsButton.tsx   # Gear icon for player bar
      FilterBar.tsx        # Feed filter UI (largest component)
      SeekButton.tsx       # Player seek forward/backward button
    player-controls/       # Player bar injection orchestration
      icons/               # SVG icons (imported via ?raw)
    filter-bar.ts          # Pure functions (formatActivityType, isFeedPage)
    signals.ts             # Shared signals (playerReady)
  injected/                # fetch/XHR monkey-patching, player discovery, command handling
  shared/
    types/                 # Modular type definitions (sc-api, filters, bridge, player, settings)
    store.ts               # ReactiveStore<T> — generic reactive localStorage store
    storage.ts             # filterStore instance
    settings-store.ts      # settingsStore instance
  test/                    # test setup, factories
```

Tests are colocated with the files they test (e.g., `filters.test.ts` next to `filters.ts`).

## Conventions

- `SCActivityType` const object is the single source of truth for activity types. Derive arrays via `Object.values()`, labels via `formatActivityType()`.
- Keep content script `index.tsx` lean — extract complex features into components or separate files.
- MutationObserver runs without debounce. Injection functions short-circuit via `getElementById` when already injected.
- All UI components are Preact functional components in `src/content-script/components/`. Use `useSignal()` from `@preact/signals` for local reactive state.
- `Modal` component + `mountModal()` helper for all dialogs — imperative mount/unmount pattern. `mountModal` creates a container div, appends to body, renders into it, returns an unmount function. Escape key handling is in `mountModal`, not the component.
- SVG icons: import via `?raw` and render with `dangerouslySetInnerHTML={{ __html: svgString }}`.
- Shared cross-component state (e.g. `playerReady`) lives in `src/content-script/signals.ts` as exported signals.
- CSS classes use `scf-` prefix to avoid collisions with SC's own classes.
- Bridge message types are a discriminated union (`BridgeMessage`) in `src/shared/types/bridge.ts`. Extend `PlayerCommand` union for new playback actions.
- New persistent state → new `ReactiveStore` instance. One line, full reactivity.
- Test factories use `Partial<T>` overrides. `buildStreamResponse` uses `Record<string, unknown>` with an `as` cast to work around `PartialDeep` type complexity.
