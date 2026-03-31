import type { SCPlayer } from "../../shared/types";
import { BridgeMessageType } from "../../shared/types";
import { discover } from "./webpack";

/**
 * Discover SC's internal player API from the webpack module cache.
 *
 * Polls until `webpackJsonp` is available and the player module is loaded,
 * since our injected script runs before SC finishes bootstrapping.
 *
 * Module-ID independent — searches by unique export signature (`playCurrent`).
 */
export function discoverPlayer(): Promise<SCPlayer> {
  return discover<SCPlayer>({
    predicate: (exp) => typeof exp.playCurrent === "function",
    datasetKey: "scfPlayerReady",
    messageType: BridgeMessageType.PlayerReady,
  });
}
