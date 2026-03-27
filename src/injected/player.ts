import type { SCPlayer } from "../shared/types";

interface WebpackModule {
  exports: Record<string, unknown>;
}

interface WebpackRequire {
  c: Record<string, WebpackModule>;
}

const POLL_INTERVAL_MS = 1000;

let probeId = 0;

/**
 * Synchronously probe webpack module cache for the player controller.
 * Returns `null` if webpack's runtime isn't ready or the player module
 * hasn't loaded yet.
 *
 * The injected script runs before SC's JS, so `webpackJsonp` starts as a
 * plain array. Webpack later replaces `.push` with its chunk-loading callback.
 * We must wait for that override before our probe module will be processed.
 *
 * Each call uses a unique chunk ID because webpack marks processed chunks
 * as loaded and silently skips duplicates.
 */
function probePlayer(): SCPlayer | null {
  const jsonp = (window as unknown as Record<string, unknown>).webpackJsonp as unknown[];
  if (!Array.isArray(jsonp)) return null;

  // Webpack runtime not loaded yet — .push is still native Array.push
  if (jsonp.push === Array.prototype.push) return null;

  const chunkName = `__sc_feed_filter_probe_${probeId++}__`;
  const holder: { require: WebpackRequire | null } = { require: null };
  jsonp.push([
    [chunkName],
    {
      [chunkName]: (_module: unknown, _exports: unknown, require: WebpackRequire) => {
        holder.require = require;
      },
    },
    [[chunkName]],
  ]);

  if (!holder.require) return null;

  const playerModule = Object.values(holder.require.c).find(
    (m) => typeof m.exports?.playCurrent === "function",
  );

  return (playerModule?.exports as SCPlayer | undefined) ?? null;
}

/**
 * Discover SC's internal player API from the webpack module cache.
 *
 * Polls until `webpackJsonp` is available and the player module is loaded,
 * since our injected script runs before SC finishes bootstrapping.
 *
 * Module-ID independent — searches by unique export signature (`playCurrent`).
 */
export function discoverPlayer(): Promise<SCPlayer> {
  const immediate = probePlayer();
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const player = probePlayer();
      if (player) {
        clearInterval(timer);
        resolve(player);
      }
    }, POLL_INTERVAL_MS);
  });
}
