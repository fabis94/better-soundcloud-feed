import type { FilterState, SCStreamResponse, SCTrackCollectionResponse } from "../../shared/types";
import { PageKind, PAGE_CONFIGS, resolvePageKind } from "../../shared/pages";
import {
  filterStreamResponse,
  filterTrackResponse,
  hasClientSideFilters,
} from "../../shared/utils/filters";
import { createdAtBucketFor, durationBucketFor } from "../../shared/utils/sc-search";
import {
  isStreamUrl,
  isRecentTracksUrl,
  isTagSearchUrl,
  withActivityTypes,
  withQueryParams,
  withBoostedLimit,
  PAGE_LIMIT_BOOST_RATIO,
} from "../../shared/utils/url";

/** Minimal response shape the interceptor needs for its before/after logging. */
export interface CollectionLike {
  collection?: unknown[];
}

/**
 * Per-page interception recipe: which API URL to catch, what to change on the
 * request (API-level filters + page-size boost) and how to filter the response.
 */
export interface InterceptTarget {
  kind: PageKind;
  isApiUrl(url: string): boolean;
  buildRequestUrl(url: string, filters: FilterState, now?: number): string;
  filterResponse(data: CollectionLike, filters: FilterState): CollectionLike;
}

/** `/recent-tracks` rejects anything above 50; the others accept far more but 200 is plenty. */
const RECENT_TRACKS_MAX_LIMIT = 50;
const DEFAULT_MAX_LIMIT = 200;

function boostIfFiltering(url: string, filters: FilterState, cap: number): string {
  return hasClientSideFilters(filters) ? withBoostedLimit(url, PAGE_LIMIT_BOOST_RATIO, cap) : url;
}

export const INTERCEPT_TARGETS: Record<PageKind, InterceptTarget> = {
  [PageKind.Feed]: {
    kind: PageKind.Feed,
    isApiUrl: isStreamUrl,
    buildRequestUrl: (url, filters) =>
      boostIfFiltering(withActivityTypes(url, filters.activityTypes), filters, DEFAULT_MAX_LIMIT),
    filterResponse: (data, filters) => filterStreamResponse(data as SCStreamResponse, filters),
  },
  [PageKind.TagRecent]: {
    kind: PageKind.TagRecent,
    isApiUrl: isRecentTracksUrl,
    // The endpoint ignores every filter param, so only the page size can be tuned.
    buildRequestUrl: (url, filters) => boostIfFiltering(url, filters, RECENT_TRACKS_MAX_LIMIT),
    filterResponse: (data, filters) =>
      filterTrackResponse(data as SCTrackCollectionResponse, filters),
  },
  [PageKind.TagPopular]: {
    kind: PageKind.TagPopular,
    isApiUrl: isTagSearchUrl,
    // Both keys are always written (null = delete) so a value SC echoed back in
    // next_href never outlives the filter that produced it.
    buildRequestUrl: (url, filters, now) =>
      boostIfFiltering(
        withQueryParams(url, {
          "filter.created_at": createdAtBucketFor(filters.createdFrom, now),
          "filter.duration": durationBucketFor(
            filters.minDurationSeconds,
            filters.maxDurationSeconds,
          ),
        }),
        filters,
        DEFAULT_MAX_LIMIT,
      ),
    filterResponse: (data, filters) =>
      filterTrackResponse(data as SCTrackCollectionResponse, filters),
  },
};

/**
 * Find the target for a request made on the given page. Both the page kind and
 * the endpoint must match, so e.g. `/search/tracks` on the global search page is
 * left alone. Targets sharing a filter store (the tag tabs) are interchangeable:
 * SC may fire a tab's first request before it pushes the new pathname.
 */
export function resolveInterceptTarget(url: string, pathname: string): InterceptTarget | null {
  const kind = resolvePageKind(pathname);
  if (!kind) return null;

  const group = PAGE_CONFIGS[kind].storeKey;
  for (const target of Object.values(INTERCEPT_TARGETS)) {
    if (PAGE_CONFIGS[target.kind].storeKey === group && target.isApiUrl(url)) return target;
  }
  return null;
}
