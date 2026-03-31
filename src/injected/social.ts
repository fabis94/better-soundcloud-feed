import type { SCSocialActions } from "../shared/types";
import { discover } from "./webpack";

/**
 * Discover SC's social actions module from the webpack module cache.
 *
 * This module handles like/unlike and repost operations via SC's internal API.
 * The entity parameter is a Backbone sound model from `getCurrentSound()`.
 */
export function discoverSocialActions(): Promise<SCSocialActions> {
  return discover<SCSocialActions>({
    predicate: (exp) => typeof exp.like === "function" && typeof exp.repost === "function",
  });
}
