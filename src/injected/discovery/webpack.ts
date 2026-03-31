interface WebpackModule {
  exports: Record<string, unknown>;
}

interface WebpackRequire {
  c: Record<string, WebpackModule>;
}

import type { BridgeMessageTypeValue } from "../../shared/types/bridge";

export type ModulePredicate = (exports: Record<string, unknown>) => boolean;

export interface DiscoverOptions {
  predicate: ModulePredicate;
  /** Dataset key to set on documentElement when found. */
  datasetKey?: string;
  /** Bridge message type to post when found. */
  messageType?: BridgeMessageTypeValue;
}

const POLL_INTERVAL_MS = 1000;
let probeId = 0;

/**
 * Synchronously probe the webpack module cache for a module matching the predicate.
 * Returns `null` if webpack's runtime isn't ready or no module matches.
 *
 * Each call uses a unique chunk ID because webpack marks processed chunks
 * as loaded and silently skips duplicates.
 */
function probe(predicate: ModulePredicate): Record<string, unknown> | null {
  const jsonp = (window as unknown as Record<string, unknown>).webpackJsonp as unknown[];
  if (!Array.isArray(jsonp)) return null;

  // Webpack runtime not loaded yet — .push is still native Array.push
  if (jsonp.push === Array.prototype.push) return null;

  const chunkName = `__scf_probe_${probeId++}__`;
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

  const match = Object.values(holder.require.c).find((m) => predicate(m.exports ?? {}));
  return match?.exports ?? null;
}

/**
 * Discover a webpack module by predicate. Polls every 1s until found.
 *
 * Optionally signals readiness via a dataset attribute on `<html>` and/or
 * a `window.postMessage` bridge message.
 */
export function discover<T>(options: DiscoverOptions): Promise<T> {
  const { predicate, datasetKey, messageType } = options;

  const signal = (result: T) => {
    if (datasetKey) {
      document.documentElement.dataset[datasetKey] = "true";
    }
    if (messageType) {
      window.postMessage({ type: messageType }, "*");
    }
    return result;
  };

  const immediate = probe(predicate);
  if (immediate) return Promise.resolve(signal(immediate as T));

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const result = probe(predicate);
      if (result) {
        clearInterval(timer);
        resolve(signal(result as T));
      }
    }, POLL_INTERVAL_MS);
  });
}
