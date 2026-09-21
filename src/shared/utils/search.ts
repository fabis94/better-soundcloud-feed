import type { SCStreamItem } from "../types";
import { SearchField } from "../types";

export interface ParsedSearch {
  includes: RegExp[];
  excludes: RegExp[];
}

/** Escape regex special chars except `*` which becomes `.*` */
function termToRegex(term: string): RegExp {
  const escaped = term.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(escaped, "i");
}

/** Parse a raw comma-delimited search string into include/exclude regexps. */
export function parseSearchString(raw: string): ParsedSearch {
  const includes: RegExp[] = [];
  const excludes: RegExp[] = [];

  const terms = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  for (const term of terms) {
    if (term.startsWith("-") && term.length > 1) {
      excludes.push(termToRegex(term.slice(1)));
    } else {
      includes.push(termToRegex(term));
    }
  }

  return { includes, excludes };
}

/**
 * Test text against a parsed search.
 * - Empty parsed (no includes, no excludes) → true
 * - Excludes: any match → false (ANDed)
 * - Includes with operator "or": any match → true
 * - Includes with operator "and": all must match → true
 * - If only excludes (no includes): pass items not matching any exclude
 */
export function matchesSearch(
  text: string,
  parsed: ParsedSearch,
  operator: "and" | "or" = "or",
): boolean {
  if (parsed.includes.length === 0 && parsed.excludes.length === 0) return true;

  // Excludes always ANDed: any match = reject
  if (parsed.excludes.some((re) => re.test(text))) return false;

  // No includes = pass (only excludes were specified)
  if (parsed.includes.length === 0) return true;

  if (operator === "or") {
    return parsed.includes.some((re) => re.test(text));
  }
  return parsed.includes.every((re) => re.test(text));
}

// --- Field extractors (safe with PartialDeep types) ---

/** Fields that exist on SC tracks/playlists but are not part of our typed surface. */
interface UntypedSoundFields {
  description?: string;
  label_name?: string;
  publisher_metadata?: { artist?: string };
}

function getInner(item: SCStreamItem) {
  return item?.track ?? item?.playlist;
}

/**
 * Text parts that make up each search area in simple mode.
 *
 * Artist covers the uploader, the reposter, and the release artist from
 * `publisher_metadata` — the name SoundCloud displays on the track itself
 * (e.g. "Peverelist" on a track uploaded by "Livity Sound").
 */
const FIELD_PARTS: Record<SearchField, (item: SCStreamItem) => string[]> = {
  [SearchField.Title]: (item) => [getInner(item)?.title ?? ""],
  [SearchField.Description]: (item) => [
    (getInner(item) as UntypedSoundFields | undefined)?.description ?? "",
  ],
  [SearchField.Genre]: (item) => [getInner(item)?.genre ?? ""],
  [SearchField.Artist]: (item) => [
    getInner(item)?.user?.username ?? "",
    item?.user?.username ?? "",
    (getInner(item) as UntypedSoundFields | undefined)?.publisher_metadata?.artist ?? "",
  ],
  [SearchField.Label]: (item) => [
    (getInner(item) as UntypedSoundFields | undefined)?.label_name ?? "",
  ],
};

const ALL_SEARCH_FIELDS: readonly SearchField[] = Object.values(SearchField);

/**
 * Text that simple-mode search runs against: the parts of every enabled area,
 * one per line. Areas are always emitted in canonical order, and unknown values
 * in `fields` (e.g. from stale persisted state) are ignored.
 *
 * Parts are newline-separated and `*` wildcards never match a newline, so a
 * single term cannot span two areas.
 */
export function getSearchableText(
  item: SCStreamItem,
  fields: readonly SearchField[] = ALL_SEARCH_FIELDS,
): string {
  return ALL_SEARCH_FIELDS.filter((field) => fields.includes(field))
    .flatMap((field) => FIELD_PARTS[field](item))
    .join("\n");
}

export function getTitleText(item: SCStreamItem): string {
  return FIELD_PARTS[SearchField.Title](item).join("\n");
}

export function getDescriptionText(item: SCStreamItem): string {
  return (item?.track as { description?: string } | undefined)?.description ?? "";
}

export function getGenreText(item: SCStreamItem): string {
  return FIELD_PARTS[SearchField.Genre](item).join("\n");
}

/** Uploader, reposter and release artist — same definition as simple mode's Artist area. */
export function getArtistText(item: SCStreamItem): string {
  return FIELD_PARTS[SearchField.Artist](item).join("\n");
}

export function getLabelText(item: SCStreamItem): string {
  return (item?.track as { label_name?: string } | undefined)?.label_name ?? "";
}
