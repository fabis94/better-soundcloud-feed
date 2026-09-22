---
description: Reference for the pages the filter bar runs on, the SoundCloud endpoint each one uses (params, limits, response TS types), which filter applies where, and the checklists for adding a filter or a page kind
alwaysApply: true
---

# Filter Pages & SoundCloud API Reference

Read this before touching filters, page kinds or the interceptor. Facts marked *verified* were reverse-engineered against the live API (Sept 2026); re-verify with the `inspect-sc-api` skill when SC behaves differently.

## Page kinds

| `PageKind`   | `location.pathname` (stays percent-encoded)                        | Store (`FilterStoreKey`)                | UI variant (`PAGE_CONFIGS[kind].ui`)                                   | Bar anchor (inserted before)     |
| ------------ | ------------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| `Feed`       | `/feed`                                                            | `bscf_filters`                          | activity row shown; date label "Date"; artist placeholder mentions reposter | `.stream__list`                  |
| `TagRecent`  | `/tags/<tag>` or `/tags/<tag>/recent-tracks` (tag may contain `/`) | `bscf_filters_tags`                     | no activity row; "Uploaded"; "artist filter"                           | `.tagsMain .tabs__contentSlot`   |
| `TagPopular` | `/tags/<tag>/popular-tracks`                                       | `bscf_filters_tags` (shared with Recent) | same as `TagRecent`                                                    | same (bar survives tab switches) |
| `null`       | `/tags/<tag>/playlists` and every other path                       | —                                       | bar removed, nothing intercepted                                       | —                                |

Sources: `resolvePageKind()` + `PAGE_CONFIGS` in `src/shared/pages.ts`; `FILTER_BAR_ANCHORS` + `syncFilterUI()` in `src/content-script/index.tsx`; `INTERCEPT_TARGETS` + `resolveInterceptTarget()` in `src/injected/intercept/targets.ts` (gates by page *group* = store key, since SC may fire a tab's first request before `pushState`).

## Endpoint per page (verified)

All `GET https://api-v2.soundcloud.com/...`, sent by SC via XHR (jQuery) with `client_id`, `app_version`, `app_locale`, `limit=10`, `offset`, `linked_partitioning=1`. User-scoped endpoints (`/stream`, `/me/...`) also need `Authorization: OAuth <token>`. Every response is the envelope `{ collection: T[], next_href: string | null, query_urn: string | null }`; **`next_href` echoes the query params we set**, so the interceptor sets-or-deletes params idempotently on every request (`withQueryParams`, null = delete).

| Page         | Endpoint (SC's own query)                                            | `T` / response type                                                                                                                  | Honoured server-side                                                                                     | Ignored (verified)                          | `limit`             |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------- |
| `Feed`       | `/stream?activityTypes=…&promoted_playlist=true&user_urn=…` (full list: `SCStreamParams`) | `SCStreamItem` `{ type, created_at (post/repost time), user (reposter), uuid, caption, track?: SCTrack, playlist?: SCPlaylist }` → `SCStreamResponse` | `activityTypes` (`SCActivityType`: `TrackPost,TrackRepost,PlaylistPost`)                                | `filter.created_at`, `filter.duration`, `sort` | 200 ok              |
| `TagRecent`  | `/recent-tracks/<tag>`                                               | bare `SCTrack` → `SCTrackCollectionResponse`                                                                                          | none                                                                                                     | every `filter.*`, `sort`, `order`           | **max 50** (60+ → 400) |
| `TagPopular` | `/search/tracks?q=*&filter.genre_or_tag=<tag>&sort=popular`          | bare `SCTrack` (+ `total_results`) → `SCTrackCollectionResponse`                                                                      | `filter.created_at` ∈ `SCCreatedAtBucket`, `filter.duration` ∈ `SCDurationBucket`, `filter.license`      | `sort` (every value returns the same order) | 200 ok              |

Pagination: `/stream` and `/search/tracks` use a numeric `offset`; `/recent-tracks` uses an opaque cursor (`offset=<iso>,recent-content-tracks-by-tag,<urn>`). "First page" = `offset` absent or `0` — that is how `withBoostedLimit()` avoids compounding the page-size boost. No endpoint supports sorting, so sorting is not a feature.

SC's client-side option lists (from its bundle): valid search params `q, q[fulltext], filter.duration, filter.created_at, filter.license, filter.genre, filter.genre_or_tag, filter.place, query_urn`; `filter.created_at` = `last_hour|last_day|last_week|last_month|last_year`; `filter.duration` = `short(<2 min)|medium(2–10)|long(10–30)|epic(>30)`; `filter.license` = `to_modify_commercially|to_use_commercially|to_share`. SC's tag router treats the last path segment as a subpage only if it is `recent-tracks|popular-tracks|playlists`.

## Types to look at

- `src/shared/types/sc-api.ts` — raw `SCRaw*` interfaces (fully typed, documentation) and the exported `SC*` aliases, which are `PartialDeep` (**always `?.`**): `SCTrack`, `SCPlaylist`, `SCUser`, `SCStreamItem`, `SCStreamResponse`, `SCTrackCollectionResponse`. Track fields the filters use: `title, description, genre, tag_list, label_name, publisher_metadata.artist, user.username, user.followers_count, duration (ms), created_at, display_date, likes_count, playback_count, reposts_count, comment_count` (the feed's `/stream` returns a trimmed `user`, but it still includes `followers_count`). Playlists: `title, genre, tag_list, user, likes_count, created_at, tracks: SCTrack[]` — no `playback_count`; `description`/`label_name` exist on the wire but are read through `UntypedSoundFields` in `src/shared/utils/search.ts`.
- `src/shared/types/filters.ts` — `FilterState` (every filter field), `SCActivityType`, `SearchField`, `SCStreamParams` (documents the complete `/stream` query).
- `src/shared/utils/sc-search.ts` — `SCCreatedAtBucket`, `SCDurationBucket`, `createdAtBucketFor()`, `durationBucketFor()` (exact range → superset bucket).
- `src/shared/utils/url.ts` — endpoint predicates (`isStreamUrl`, `isRecentTracksUrl`, `isTagSearchUrl`), `withQueryParams`, `withActivityTypes`, `withBoostedLimit`, `PAGE_LIMIT_BOOST_RATIO`.
- Test factories: `src/test/factories.ts` (`buildTrack`, `buildPlaylist`, `buildStreamItem`, `buildStreamResponse`, `buildTrackCollectionResponse`, `buildFilters`).

## Filter matrix

| Filter (`FilterState` fields)                                                      | `Feed`                                         | `TagRecent`                    | `TagPopular`                                            |
| ---------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| Activity types (`activityTypes`)                                                   | API                                            | row hidden                     | row hidden                                              |
| Search (`searchMode`, `searchString`, `searchFields`, `search*`, `searchOperator`) | client                                         | client (no reposter)           | client                                                  |
| Duration (`minDurationSeconds`, `maxDurationSeconds`)                              | client                                         | client                         | API bucket when the range fits one band, + client       |
| Date (`createdFrom`, `createdTo`; local `YYYY-MM-DD`, inclusive) | client: post/repost time **or** upload time | client vs track `created_at` | API `filter.created_at` from `createdFrom`, + client |
| Likes / Plays (`minLikes`, `maxLikes`, `minPlays`, `maxPlays`)                     | client                                         | client                         | client                                                  |
| Followers (`minFollowers`, `maxFollowers`; `user.followers_count`, verified present on all three endpoints; no server-side param) | client: uploader **or** reposter | client (uploader) | client (uploader) |
| Page-size boost (`hasClientSideFilters()` → first-page `limit × 2`)                | yes (cap 200)                                  | yes (cap 50)                   | yes (cap 200)                                           |

"client" = `matchesFilters()` in `src/shared/utils/filters.ts` (bare tracks are wrapped by `trackToStreamItem()`, so one predicate serves every page); "API" = the target's `buildRequestUrl()`.

**Any-source rule** (applies to every filter — keep it when adding one): when an item offers a value from several sources — Artist search: uploader, reposter and release-artist names; Date: `item.created_at` (post/repost time) and the sound's `created_at` (upload); Followers: `sound.user` (uploader/owner) and `item.user` (reposter) — the filter passes if **any one** source satisfies it (`anyInRange()`), a text exclude rejects if any source matches, and sources SC omitted are skipped (no source at all → pass). Playlist rule: a playlist with tracks passes if the playlist itself (search, date, `likes_count`, owner's/poster's followers) or any track inside (search, date via the post time or that track's upload, duration, likes, plays, its uploader's/the poster's followers) passes; the playlist-level check is skipped while a track-only filter (duration, plays) is active. Date/likes/plays rows live in the "More filters" accordion (`uiStore`, key `bscf_ui`).

## Design rules every filter must follow

These are product decisions, not accidents. Apply them to any new filter and call it out in the PR/plan if one cannot hold.

1. **Any-source rule.** When an item offers the same kind of value from several sources, the filter passes if **any one** source satisfies it. Today's sources — names: uploader (`sound.user`), reposter/poster (`item.user`), release artist (`publisher_metadata.artist`); dates: `item.created_at` (post/repost time) and `sound.created_at` (upload); follower counts: `sound.user` and `item.user`. Text excludes reject if any source matches. Implement ranges with `anyInRange()` in `filters.ts`; never silently pick one source. If a new filter reads a value that exists on both the sound and the reposter/poster, include both, and add a test per source plus one where no single source satisfies both bounds.
2. **Missing data passes.** SC's types are `PartialDeep`; a value SC omitted, or an unparseable one, never rejects an item. Only when *no* source is present does the filter pass by default — a present source that is out of range still rejects.
3. **Playlist posts.** Metadata that exists on the playlist (search fields, date, likes, owner's/poster's followers) is checked at playlist level; track-only metrics (duration, plays) disable the playlist-level pass; a playlist passes if the playlist-level check or any track inside passes. New track-only metrics join the "disable" list; new playlist-level metadata joins the playlist check.
4. **Client-side by default, API-level only when verified.** Map a filter to an SC param only after `inspect-sc-api` shows the endpoint honours it, and only as a *superset* of the exact range (the client predicate always runs). Params are set-or-deleted on every request because `next_href` echoes them.
5. **Same filter, every page.** A filter applies on every page kind unless the data cannot exist there (activity types are feed-only). Page differences are expressed through `PageUiConfig` (labels, visibility), never by branching on `PageKind` in components or predicates.
6. **Niche filters live in the "More filters" accordion** (date, likes, plays, followers) and count toward its badge; core ones (activity types, search, duration) stay visible.
7. **Explicit apply.** Nothing filters until Apply & Reload; the page-size boost (`hasClientSideFilters()`) must know about every client-side filter.

## Checklist: adding a filter

1. **State** — field on `FilterState` (`src/shared/types/filters.ts`) + default in `DEFAULT_FILTERS` (`src/shared/stores/filter-store.ts`); `ReactiveStore` merges defaults, so persisted state stays compatible. Add the field to the `defaultFilters` mocks in `src/content-script/index.test.tsx` and `src/injected/index.test.ts`.
2. **Predicate** — `src/shared/utils/filters.ts`: list every source of the value on each item kind (track post, repost, playlist post, bare tag track), then extend `matchesSoundFilters()` with `anyInRange()` / `inRange()` / `isRangeActive()` following the design rules above (any source; missing passes; playlist handling); add the field to `hasClientSideFilters()` if it is client-side. Tests in `filters.test.ts`: one per source, one where no single source satisfies both bounds, the playlist cases, and the missing-data case.
3. **API-level (optional)** — if the endpoint honours a param (verify with `inspect-sc-api`), map it in that target's `buildRequestUrl` (`src/injected/intercept/targets.ts`) via `withQueryParams` (null deletes, because of the `next_href` echo); pure range→bucket helpers go in `sc-search.ts`. Tests in `targets.test.ts` (+ `sc-search.test.ts`).
4. **UI** — `src/content-script/components/FilterBar.tsx`: signal, `readFilters()`, `resetToDefaults()`, a row (`scf-…` ids; inside the accordion body if niche, and then in `activeAdvanced`). Page-specific labels/visibility go through `PageUiConfig` in `pages.ts` — components never branch on `PageKind`. Tests in `FilterBar.test.tsx`.
5. **Docs** — run the `update-documentation` skill (README, help modal, storefront text, repo guide, this file).

## Checklist: adding a page kind

`PageKind` + `resolvePageKind()` + `PAGE_CONFIGS` (`pages.ts`) → store (`getFilterStore` mapping, new `FilterStoreKey` if the page should not share state) → URL predicate in `url.ts` + `INTERCEPT_TARGETS` entry (`targets.ts`; verify params/limits/response shape with `inspect-sc-api` first) → `FILTER_BAR_ANCHORS` entry (pick a node that survives SC's SPA re-renders) → tests (`pages.test.ts`, `targets.test.ts`, `intercept/index.test.ts`, `content-script/index.test.tsx`) → docs (this file's tables, README, help modal).
