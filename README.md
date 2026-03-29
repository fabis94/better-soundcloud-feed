<p align="center">
  <img src="public/icon.svg" width="128" height="128" alt="Better SoundCloud Feed">
</p>

# Better SoundCloud Feed

Chrome/Edge/Firefox extension (Manifest V3) that filters your SoundCloud feed and adds extra playback controls.

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

Changes only take effect when the user clicks **Apply** or **Apply & Reload**.

### Player Controls

| Control             | Behavior                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Settings button** | Gear icon in the player bar — opens extension settings dialog.                                     |
| **Seek forward**    | Seeks forward by configurable seconds (default 30), or skips to next track if near the end.        |
| **Seek backward**   | Seeks backward by configurable seconds (default 30), or skips to previous track if near the start. |

Seek buttons are enabled by default. Toggle and customize the seek duration in extension settings. Player controls appear greyed out until the player API is discovered, then become active.

## License

[MIT](LICENSE)
