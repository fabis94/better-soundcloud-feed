import type { SCStreamItem } from "../types";

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

export function getAllSearchableText(item: SCStreamItem): string {
  const inner = item?.track ?? item?.playlist;
  return [
    inner?.title ?? "",
    (inner as { description?: string } | undefined)?.description ?? "",
    inner?.genre ?? "",
    inner?.user?.username ?? "",
    item?.user?.username ?? "",
    (inner as { label_name?: string } | undefined)?.label_name ?? "",
    (inner as { publisher_metadata?: { artist?: string } } | undefined)?.publisher_metadata
      ?.artist ?? "",
  ].join("\n");
}

export function getTitleText(item: SCStreamItem): string {
  const inner = item?.track ?? item?.playlist;
  return inner?.title ?? "";
}

export function getDescriptionText(item: SCStreamItem): string {
  return (item?.track as { description?: string } | undefined)?.description ?? "";
}

export function getGenreText(item: SCStreamItem): string {
  const inner = item?.track ?? item?.playlist;
  return inner?.genre ?? "";
}

export function getArtistText(item: SCStreamItem): string {
  const inner = item?.track ?? item?.playlist;
  return [inner?.user?.username ?? "", item?.user?.username ?? ""].join("\n");
}

export function getLabelText(item: SCStreamItem): string {
  const track = item?.track as
    | { label_name?: string; publisher_metadata?: { artist?: string } }
    | undefined;
  return [track?.label_name ?? "", track?.publisher_metadata?.artist ?? ""].join("\n");
}
