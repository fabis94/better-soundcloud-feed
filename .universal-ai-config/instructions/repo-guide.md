---
description: Core project architecture, conventions, and constraints for the SoundCloud Feed Filter browser extension
alwaysApply: true
---

# SoundCloud Feed Filter — Repo Guide

Manifest V3 browser extension (Chrome/Edge/Firefox) that filters SoundCloud's `/feed` page and tag pages (`/tags/<tag>`, Recent + Popular tabs) by intercepting `api-v2.soundcloud.com` list endpoints (`/stream`, `/recent-tracks/<tag>`, `/search/tracks?filter.genre_or_tag=…`), and adds extended playback controls via SC's internal player API.

## Architecture

Two entry points, each built as separate IIFE bundles via Vite Environments API:

- **Content script** (`src/content-script/`) — runs in isolated world. UI components are Preact functional components (`.tsx`) with `@preact/signals` for reactivity in `src/content-script/components/`. Mounts the filter UI on supported pages (see Page Kinds) and tears it down elsewhere; injects player controls into SC's player bar.
- **Injected script** (`src/injected/`) — runs in page context (main world), declared in `manifest.json` as a `world: "MAIN"` content script at `document_start` so the fetch/XHR patch is in place synchronously before SC's first `/stream` request. Browsers that predate `world: "MAIN"` (Chrome/Edge < 111, Firefox < 128) ignore the key and run the file in an isolated world; `src/injected/world.ts` detects that via `chrome.runtime.id` and falls back to loading `injected.js` through a `<script>` tag. That fallback is async and can race SC's bootstrap on fast machines (initial feed load bypasses filters), which is why it is not the primary path. `web_accessible_resources` exists only for the fallback. In dev builds the page-world copy logs which loading style was used (`detectLoadStyle()`, based on `document.currentScript`). Monkey-patches `window.fetch` and `XMLHttpRequest` to intercept and filter SC API responses. Discovers SC's internal player and social-actions APIs from webpack module cache, handles playback commands, and manages the Picture-in-Picture player window.

Communication between the two: `window.postMessage` bridge with typed `BridgeMessage` union (constants in `BridgeMessageType`) and `ReactiveStore` cross-realm sync.

Shared code lives in `src/shared/` — types (`types/`), stores (`stores/`), utilities (`utils/`), page kinds (`pages.ts`).

## Page Kinds

`src/shared/pages.ts` is the single source of truth for *where* the extension is active. `resolvePageKind(pathname)` mirrors SC's router (`/feed` → `Feed`; `/tags/<tag>[/recent-tracks]` → `TagRecent`; `/tags/<tag>/popular-tracks` → `TagPopular`; `/tags/<tag>/playlists` and everything else → `null`). Every per-page difference is data keyed by `PageKind`, never a branch on the pathname elsewhere:

- **`PAGE_CONFIGS`** (shared, dependency-free) — `storeKey` (`bscf_filters` for the feed, `bscf_filters_tags` shared by both tag tabs) and `ui` (`PageUiConfig`: `showActivityTypes`, `dateLabel` "Date"/"Uploaded", `artistPlaceholder`). The content script picks the store with `getFilterStore(kind)` and passes `ui` to `FilterBar`.
- **`INTERCEPT_TARGETS`** (`src/injected/intercept/targets.ts`, injected only so the filter engine stays out of the content bundle) — per kind: `isApiUrl(url)`, `buildRequestUrl(url, filters)` (API-level params + page-size boost) and `filterResponse(json, filters)` (client-side). `resolveInterceptTarget(url, pathname)` requires both the page kind and the endpoint to match, and accepts any target in the same store group — SC may fire a tab's first request before it pushes the new pathname.

Per-page endpoint, params, limits, response TS types, the filter matrix and the add-a-filter / add-a-page checklists live in `<%= instructionPath('filter-pages') %>`. Verify SC's live behaviour with the `inspect-sc-api` skill (Chrome DevTools MCP).

Content-script mounting (`syncFilterUI(pathname)` in `src/content-script/index.tsx`, run on every MutationObserver tick): the bar container carries `data-store-key`; a bar bound to another store, or any bar on an unsupported path (e.g. the Playlists tab), is unmounted via `render(null, …)` and removed. Anchors live in `FILTER_BAR_ANCHORS` — the feed bar goes before `.stream__list`, the tag bar before `.tagsMain .tabs__contentSlot` (SC keeps `.tabs__content` across tab switches and only rebuilds the list, so the bar survives Recent ↔ Popular).

## Webpack Module Discovery

The injected script discovers SC's internal APIs from the webpack module cache via a generic `discover()` utility (`src/injected/discovery/webpack.ts`). It probes via `webpackJsonp.push` with a unique chunk ID per attempt, searching for modules matching a predicate. Module-ID independent — works regardless of SC's chunk ordering or minification.

Currently discovers:
- **Player API** (`src/injected/discovery/player.ts`) — predicate: `playCurrent` export. Assigned to `window.scPlayer`.
- **Social Actions** (`src/injected/discovery/social.ts`) — predicate: `like` + `repost` exports. Assigned to `window.scSocialActions`. Handles like/unlike via SC's internal API.

Key details:
- **Discovery is async** — the injected script runs before SC's webpack runtime loads. `discover()` polls every 1s until the runtime and target module are available.
- `discover()` optionally signals readiness via `dataset` attribute + `postMessage` (using `BridgeMessageType` constants).
- **Content script cannot access `window.scPlayer` directly** (isolated world). It sends `BridgeMessageType.PlayerCommand` messages; the injected script executes them via `handlePlayerCommand()` in `src/injected/player/commands.ts`.
- `seekCurrentTo` and `seekCurrentBy` take **callback functions** `(sound) => number`, not raw numbers.
- Seek logic (`src/injected/player/seek.ts`) has a pure `resolveSeekAction()` for boundary detection (skip next at >90%, skip prev at <10%).

## Picture-in-Picture (PiP)

The extension supports Document Picture-in-Picture (`documentPictureInPicture.requestWindow()`) for an always-on-top player window when switching tabs. Chromium 116+, Firefox 148+ (behind `dom.documentpip.enabled`).

Architecture:
- **PiP lifecycle** (`src/injected/pip/index.ts`) — opens/closes the PiP window, registers `enterpictureinpicture` media session handler for auto-PiP on tab switch. Exports `togglePip()` (open/close toggle used by the manual button) and `setupAutoPip(enabled)`. Auto-PiP lifecycle (open on tab leave, close on tab return) is managed by the browser; manual PiP stays open until the user closes it.
- **PiP UI** (`src/injected/pip/ui.tsx`) — Preact components rendered into the PiP document. Includes track header (title link + like button), artwork, waveform canvas, transport controls, branding.
- **Polling** (`src/injected/pip/poll.ts`) — 250ms interval updates Preact signals from `window.scPlayer` state. Module-level signals are reset via `resetSignals()` on each PiP session to avoid stale state.
- **Waveform** (`src/injected/pip/waveform.ts`) — fetches SC waveform JSON (`wave.sndcdn.com/*.json`, 1800 samples), renders as canvas bars with progress overlay.
- **Styles** (`src/injected/pip/styles.ts`) — CSS injected into PiP document. Uses SC CSS variables (copied from main page via `copyThemeVariables()`) for dark/light theme support.

The PiP window runs in the **page context** (same realm as the injected script), so it has direct access to `window.scPlayer` and `window.scSocialActions` — no bridge messages needed for PiP controls.

The liked state is read from SC's player bar DOM (`document.querySelector(".playbackSoundBadge__like").classList.contains("sc-button-selected")`), cached per track change.

Type declarations for the Document PiP API are in `src/document-pip.d.ts` (not yet in lib.dom.d.ts).

## Reactive Store (`ReactiveStore<T>`)

`src/shared/stores/reactive-store.ts` provides a generic, type-safe, reactive localStorage-backed store. All persistent state uses this:

- `filterStore` / `tagFilterStore` (`src/shared/stores/filter-store.ts`) — feed and tag-page filter state (same `FilterState` shape, separate keys), explicit-apply semantics; `getFilterStore(kind)` maps a `PageKind` to its store
- `settingsStore` (`src/shared/stores/settings-store.ts`) — extension settings, instant-apply semantics
- `uiStore` (`src/shared/stores/ui-store.ts`, key `bscf_ui`) — UI preferences such as the filter bar's "More filters" accordion state, instant-apply semantics (persisted on toggle)

API: `get()`, `get(key)`, `update(patch)`, `subscribe(fn)`, `reload()`, `isAvailable()`. `subscribe()` returns an unsubscribe function. State is lazy-loaded on first access, merged with defaults.

Creating a new store is one line:
```ts
export const myStore = new ReactiveStore<MyState>("bscf_mystate", MY_DEFAULTS);
```

### Cross-realm sync

Both IIFE bundles (content script + injected script) create their own `ReactiveStore` instances. Since they run in separate JS realms but share the same `localStorage` and `window.postMessage` channel, the store self-syncs:

- `update()` persists to localStorage, notifies local subscribers, then posts `BridgeMessageType.StoreSync` with the store key via `window.postMessage`.
- Each store listens for `BridgeMessageType.StoreSync` messages matching its key. On receipt, it reloads from localStorage and notifies its own subscribers.
- No manual message passing needed for persistent state — just call `update()` in one realm and `subscribe()` in the other.

This is why no filter-update message exists — filter sync is handled entirely by the filter stores' cross-realm reactivity. Use explicit `BridgeMessage` types only for transient actions (commands, readiness signals) that aren't persisted state.

## Key Constraints

- **SC API types are `PartialDeep`**. SoundCloud's API is undocumented and can change without notice. Raw types (`SCRaw*`) are internal; exported types use `PartialDeep` from type-fest. Always use `?.` when accessing SC data fields. Code must gracefully handle missing/malformed data.
- **IIFE output only**. Content scripts cannot use ES modules. Both entries build as IIFE via Vite Environments API with `consumer: "client"` on the injected environment to bundle node_modules.
- **No top-level await**. Content scripts don't support it. LogTape uses `configureSync`.
- **Preact, not Custom Elements**. Content script isolated worlds don't have access to `customElements` API. All UI uses Preact (`render()` into plain DOM nodes) with `@preact/signals` for fine-grained reactivity. No Shadow DOM, no web components. tsconfig requires `"jsx": "react-jsx"` and `"jsxImportSource": "preact"`.
- **Multiple Preact render roots**. Each injection site (filter bar, modals, player buttons) gets its own `render()` call to its own container element. There is no single app root.
- **SC CSS variables for theming**. Never use hardcoded colors in `filter-ui.css`. Use SoundCloud's own CSS variables (see docblock in that file) for light/dark theme support.
- **Explicit apply workflow** for filters. Filters are only persisted (to the page's store) when the user clicks Apply & Reload, which then reloads the page — it is the only apply action. UI-only changes (Simple/Extended and All/Any pills, Clear) don't auto-apply.
- **Instant apply for settings**. Extension settings (e.g. skip-forward toggle) take effect immediately via `settingsStore.subscribe()`. UI preferences (`uiStore`) are likewise persisted the moment they change.
- **"More filters" accordion**. `FilterBar` keeps date/likes/plays in a collapsible section; the open state comes in via `initialAdvancedOpen` and changes go out via `onAdvancedOpenChange` (wired to `uiStore` in `content-script/index.tsx`). Collapsed inputs still feed `readFilters()`, so the toggle shows a count badge of the active ones (names in its `title`).
- **localStorage persistence**. The filter stores and `settingsStore` use `localStorage` directly (not `chrome.storage`), so both the content script and injected script (page context) can access them. All keys use the `bscf_` prefix.
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
Feed only. Controlled at request level — `activityTypes` query param is set on outgoing SC API requests. Values defined in `SCActivityType` const object (single source of truth). Derive labels with `formatActivityType()`.

### Search
Two modes: **simple** (single input, matched against the combined text of the ticked search areas) and **extended** (per-field: title, description, genre, artist, label). Both support:
- Comma-delimited terms
- `-exclude` prefix to reject matches
- `*wildcard` glob patterns
- AND/OR operator toggle (applies to both modes)

Search areas are defined by the `SearchField` const object. In simple mode, `FilterState.searchFields` lists the ticked areas ("Search in" checkboxes, all ticked by default); `getSearchableText(item, fields)` in `search.ts` builds the text from only those areas. Terms match against the combined text, so with AND each term may come from a different ticked area. An empty `searchFields` means the search is ignored, mirroring extended mode with all inputs empty. `searchFields` has no effect in extended mode.

The **Artist** area covers uploader (`track.user`), reposter (`item.user`) and the release artist (`publisher_metadata.artist`), which is the name SC displays on the track. **Label** is `label_name` only. Both modes share this definition via `FIELD_PARTS` in `search.ts`.

### Duration
Min/max in minutes (UI) → stored as seconds → compared against `track.duration` (milliseconds). Tracks only.

### Date
`createdFrom` / `createdTo` are inclusive local calendar days (`"YYYY-MM-DD"` from `<input type="date">`; parsed by `src/shared/utils/date.ts`, never via `new Date(string)` which is UTC). Any-source rule: `item.created_at` (post/repost time on the feed) and the sound's `created_at` (upload time) are both candidates and one in range is enough; bare tag tracks have only the upload time. No parseable candidate → pass.

### Likes / plays / followers
`minLikes`/`maxLikes`/`minPlays`/`maxPlays`/`minFollowers`/`maxFollowers`, inclusive, client-side everywhere (SC has no count filters). Followers follow the any-source rule via `anyInRange()`: the uploader's (or playlist owner's) and, on the feed, the reposter's `followers_count` — one in range is enough; sources SC omits are skipped. Missing counts pass. All numeric range checks share `inRange()` in `filters.ts`.

### API-level buckets (Popular tab only)
`src/shared/utils/sc-search.ts` maps exact ranges onto SC's coarse `/search/tracks` buckets, always choosing a *superset* so the client-side predicate does the exact refinement: `createdAtBucketFor(from)` (conservative window lengths plus a 15-minute grace margin so a later page keeps the same bucket) and `durationBucketFor(min, max)` (only when the range fits one band). Both keys are always set-or-deleted on the request because SC echoes them back in `next_href`.

### Page-size boost
When `hasClientSideFilters()` is true (anything but activity types), `withBoostedLimit()` multiplies `limit` by `PAGE_LIMIT_BOOST_RATIO` (2) on first-page requests only (`offset` absent or `0`) with a per-endpoint cap; later pages come from `next_href`, which already echoes the boosted value, so touching them would compound.

### Playlist filtering
A playlist with tracks passes if the playlist metadata itself (search, date, `likes_count`, owner's/poster's followers) OR any individual track within it (search, date, duration, likes, plays, followers) matches; the playlist-level check is skipped while a track-only filter (duration, plays) is active. Bare tracks from the tag endpoints reuse the same `matchesFilters()` via `trackToStreamItem()` / `filterTrackResponse()`.

## Public presence

You can find the link to the repository in package.json

## Icons

SVG icons are stored as `.svg` files and imported via `?raw` suffix (Vite inlines them as strings).

## Directory Structure

```
src/
  content-script/          # UI injection, DOM interaction
    components/            # Preact functional components (.tsx)
      Modal.tsx            # Reusable modal (backdrop, dialog, close)
      HelpModal.tsx        # In-app help content
      SettingsModal.tsx    # Playback + PiP settings form
      SettingsButton.tsx   # Gear icon for player bar
      PipButton.tsx        # PiP toggle button for player bar
      FilterBar.tsx        # Feed filter UI (largest component)
      SeekButton.tsx       # Player seek forward/backward button
    player-controls/       # Player bar injection orchestration
      icons/               # SVG icons (imported via ?raw)
    feed/                  # Filter bar utilities
      filter-bar.ts        # FILTER_BAR_ID, formatActivityType, formatSearchField
    signals.ts             # Shared signals (playerReady, pipSupported)
  injected/
    discovery/             # Webpack module discovery
      webpack.ts           # Generic discover() utility
      player.ts            # SC player API discovery
      social.ts            # SC social actions discovery
    intercept/             # API interception
      index.ts             # fetch/XHR monkey-patching
      targets.ts           # INTERCEPT_TARGETS per PageKind + resolveInterceptTarget
    pip/                   # Document Picture-in-Picture player
      index.ts             # PiP lifecycle (open/close, auto-PiP)
      ui.tsx               # Preact components for PiP window
      poll.ts              # Signals + polling loop
      waveform.ts          # Canvas rendering + waveform fetch
      styles.ts            # CSS + theme variable copying
      icons/               # PiP-specific SVG icons
    player/                # Player command handling
      commands.ts          # handlePlayerCommand dispatcher
      seek.ts              # seekOrSkip + resolveSeekAction
    index.ts               # Entry point (wiring)
  shared/
    types/                 # Modular type definitions
    stores/                # ReactiveStore class + instances
      reactive-store.ts    # ReactiveStore<T> generic class
      filter-store.ts      # filterStore + tagFilterStore + getFilterStore, defaults
      settings-store.ts    # settingsStore instance
      ui-store.ts          # uiStore instance (UI preferences)
    utils/                 # Pure utilities
      filters.ts           # Stream/track response filtering, hasClientSideFilters
      search.ts            # Search term matching
      sc-search.ts         # Exact ranges → SC search buckets (Popular tab)
      date.ts              # Local "YYYY-MM-DD" parsing / ranges
      url.ts               # Endpoint predicates, query helpers, page-size boost
      format.ts            # formatTime, getArtworkUrl
      logger.ts            # LogTape logger factory
    constants.ts           # REPO_URL
    pages.ts               # PageKind, resolvePageKind, PAGE_CONFIGS
  test/                    # Test setup, factories
```

Tests are colocated with the files they test (e.g., `filters.test.ts` next to `filters.ts`).

## Conventions

- `SCActivityType` const object is the single source of truth for activity types. Derive arrays via `Object.values()`, labels via `formatActivityType()`.
- `SearchField` const object is the single source of truth for search areas. Derive arrays via `Object.values()`, labels via `formatSearchField()`. Adding an area means adding it there and to `FIELD_PARTS` in `search.ts`.
- Keep content script `index.tsx` lean — extract complex features into components or separate files.
- MutationObserver runs without debounce. Injection functions short-circuit via `getElementById` when already injected.
- All UI components are Preact functional components in `src/content-script/components/`. Use `useSignal()` from `@preact/signals` for local reactive state.
- `Modal` component + `mountModal()` helper for all dialogs — imperative mount/unmount pattern. `mountModal` creates a container div, appends to body, renders into it, returns an unmount function. Escape key handling is in `mountModal`, not the component.
- SVG icons: import via `?raw` and render with `dangerouslySetInnerHTML={{ __html: svgString }}`.
- Shared cross-component state (e.g. `playerReady`) lives in `src/content-script/signals.ts` as exported signals.
- CSS classes use `scf-` prefix to avoid collisions with SC's own classes.
- Bridge message types are a discriminated union (`BridgeMessage`) in `src/shared/types/bridge.ts`. All type strings live in `BridgeMessageType` const object — never use magic strings. Extend `PlayerCommand` union for new playback actions.
- New persistent state → new `ReactiveStore` instance. One line, full reactivity.
- New filter → follow the design rules in `<%= instructionPath('filter-pages') %>` (any-source rule via `anyInRange()`, missing data passes, playlist handling, client-side unless the API is verified to honour a param, page differences via `PageUiConfig`).
- New page to filter → add a `PageKind`, its `PAGE_CONFIGS` entry (store + `ui`), its `INTERCEPT_TARGETS` entry (endpoint predicate + request/response transforms) and a `FILTER_BAR_ANCHORS` entry. Components never branch on page kind — `FilterBar` only reads its `ui: PageUiConfig` prop.
- New SC webpack module to discover → add a predicate in `src/injected/discovery/`, use `discover()` from `webpack.ts`.
- PiP UI uses Preact with module-level `@preact/signals` for reactive state, updated by a 250ms polling loop. Canvas rendering (waveform) stays imperative via `useEffect`.
- Test factories use `Partial<T>` overrides. `buildStreamResponse` uses `Record<string, unknown>` with an `as` cast to work around `PartialDeep` type complexity.
