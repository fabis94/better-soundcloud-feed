<p align="center">
  <img src="public/icon.svg" width="128" height="128" alt="Better SoundCloud Feed">
</p>

# Better SoundCloud Feed

Chrome/Edge/Firefox extension (Manifest V3) that filters your SoundCloud feed and adds extra playback controls. Intercepts `api-v2.soundcloud.com/stream` API calls to filter items, and discovers SC's internal player API for extended playback features.

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

Navigate to [soundcloud.com](https://soundcloud.com/) — a filter bar appears above your feed, and extension controls appear in the player bar.

## Development

```bash
pnpm dev          # Build in watch mode
pnpm build        # Production build
pnpm test         # Unit tests (Vitest)
pnpm check        # Lint (Oxlint) + format check (Oxfmt)
pnpm typecheck    # TypeScript strict mode
pnpm check:unused # Dead code detection (Knip)
```

After rebuilds, reload the extension in the browser to pick up changes.

## Features

### Feed Filters

| Filter                | Behavior                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Activity types**    | Checkboxes for track posts, track reposts, and playlist posts. Controls the `activityTypes` query param at the API level — unchecked types are never fetched. |
| **Search (simple)**   | Single input matching against all fields (title, description, genre, artist, label).                                                                          |
| **Search (extended)** | Per-field inputs: title, description, genre, artist, label. Only non-empty fields are checked.                                                                |
| **Search syntax**     | Comma-separated terms, `-exclude` prefix, `*wildcard` globs, case-insensitive. AND/OR operator toggle.                                                        |
| **Duration**          | Min/max in minutes. Applies to tracks only (not playlist totals).                                                                                             |

Filters are persisted in `localStorage` via `ReactiveStore`. Changes only take effect when the user clicks **Apply** or **Apply & Reload**.

### Player Controls

The extension discovers SC's internal player API from the webpack module cache and exposes it as `window.scPlayer`. This enables:

| Control             | Behavior                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Settings button** | Gear icon in the player bar — opens extension settings dialog.                           |
| **Skip forward**    | Seeks 30s forward, or skips to next track if near the end. Toggle in extension settings. |

Player controls appear greyed out until the player API is discovered, then become active.

## How it works

Browser extensions enforce two separate JavaScript environments:

- **Content script** (`src/content-script/`) runs in an **isolated world** — it can access `chrome.*` extension APIs and the page DOM, but has its own `window` object separate from the page's.
- **Injected script** (`src/injected/`) runs in the **page context (main world)** — the same environment as SoundCloud's code, so it can patch `window.fetch` and `XMLHttpRequest`, and access SC's webpack internals. Cannot access extension APIs.

The two scripts communicate over `window.postMessage` (the DOM is the one thing both worlds share).

### Message protocol

| Message             | Direction          | Purpose                              |
| ------------------- | ------------------ | ------------------------------------ |
| `SC_FILTER_UPDATE`  | content → injected | Send new filter state                |
| `SC_FILTER_READY`   | injected → content | Injected script initialized          |
| `SC_PLAYER_READY`   | injected → content | SC player API discovered             |
| `SC_PLAYER_COMMAND` | content → injected | Execute playback command (e.g. skip) |

### Player API discovery

The injected script discovers SC's internal player controller by probing the webpack module cache via `webpackJsonp.push`. It searches for the module exporting `playCurrent` (unique signature), which is module-ID independent — works regardless of chunk ordering or minification. The probe polls every second until webpack's runtime is loaded and the player module is available.

## Project structure

```
src/
├── content-script/            # UI injection, DOM interaction
│   ├── index.ts               # Entry: injects page script, mounts filter UI, bridges messages
│   ├── filter-bar.ts          # Filter bar creation, read/restore state, event wiring
│   ├── help-modal.ts          # Help dialog (uses generic modal)
│   ├── modal.ts               # Generic modal utility (backdrop, close, escape)
│   └── player-controls/       # Player bar button injection
│       ├── index.ts            # Orchestration: inject buttons, track player readiness
│       ├── settings-modal.ts   # Settings gear button + settings dialog
│       ├── skip-button.ts      # Skip-forward button + click handler
│       └── icons/              # SVG icons (imported via ?raw)
├── injected/                  # Runs in page context (main world)
│   ├── index.ts               # Entry: fetch/XHR patching, player discovery, command handler
│   ├── intercept.ts           # Fetch and XHR interception + response filtering
│   └── player.ts              # webpack module probe for SC player API
├── shared/                    # Shared between both entry points
│   ├── types/                 # Modular type definitions
│   │   ├── sc-api.ts          # SC API response types (PartialDeep)
│   │   ├── filters.ts         # FilterState, SCActivityType
│   │   ├── bridge.ts          # BridgeMessage union, PlayerCommand
│   │   ├── player.ts          # SC player internal types + Window augmentation
│   │   ├── settings.ts        # ExtensionSettings interface
│   │   └── index.ts           # Barrel re-exports
│   ├── store.ts               # ReactiveStore<T> — generic reactive localStorage store
│   ├── storage.ts             # filterStore instance + DEFAULT_FILTERS
│   ├── settings-store.ts      # settingsStore instance
│   ├── filters.ts             # Pure filter logic (matchesFilters, filterStreamResponse)
│   ├── search.ts              # Search string parsing, field extractors
│   ├── url.ts                 # URL helpers (isStreamUrl, extractUrl, withActivityTypes)
│   └── logger.ts              # LogTape configuration
└── test/
    └── factories.ts           # Typed factory functions for test fixtures
```

## License

[MIT](LICENSE)
