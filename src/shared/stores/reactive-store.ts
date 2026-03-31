import { createLogger } from "../utils/logger";
import { BridgeMessageType } from "../types";

const log = createLogger("store");

interface StoreSyncMessage {
  type: typeof BridgeMessageType.StoreSync;
  key: string;
}

type Listener<T> = (state: T) => void;

/**
 * Generic reactive localStorage-backed store with cross-realm sync.
 *
 * Persists state as JSON under a given key, merges with defaults on load,
 * and notifies subscribers on every `update()` call.
 *
 * Cross-realm sync: when `update()` is called, a `SC_STORE_SYNC` message is
 * posted via `window.postMessage`. Other realms (e.g. content script ↔ injected
 * script) holding a store with the same key will reload from localStorage and
 * notify their own subscribers. This means both realms stay in sync without
 * manual message passing.
 */
export class ReactiveStore<T extends object> {
  private state: T | null = null;
  private readonly listeners = new Set<Listener<T>>();

  constructor(
    private readonly key: string,
    private readonly defaults: T,
  ) {
    this.listenForSync();
  }

  private ensureLoaded(): T {
    if (this.state === null) {
      this.state = this.load();
    }
    return this.state;
  }

  /** Get the full current state (shallow copy). */
  get(): T;
  /** Get a single key from the current state. */
  get<K extends keyof T>(key: K): T[K];
  get<K extends keyof T>(key?: K): T | T[K] {
    const state = this.ensureLoaded();
    if (key !== undefined) return state[key];
    return { ...state };
  }

  /** Re-read state from localStorage, discarding any cached state. */
  reload(): void {
    this.state = this.load();
  }

  /** Merge a partial patch into the state, persist, and notify subscribers. */
  update(patch: Partial<T>): void {
    this.state = { ...this.ensureLoaded(), ...patch };
    this.save();
    this.notify();
    this.postSync();
  }

  /**
   * Subscribe to state changes. The listener is called with the new state
   * on every `update()` and on cross-realm sync. Returns an unsubscribe function.
   */
  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Check if localStorage is available for this store. */
  isAvailable(): boolean {
    try {
      const testKey = `${this.key}__test__`;
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      log.error("localStorage is not available for store {key}", { key: this.key });
      return false;
    }
  }

  private notify(): void {
    const snapshot = this.get();
    for (const fn of this.listeners) fn(snapshot);
  }

  private postSync(): void {
    try {
      const msg: StoreSyncMessage = { type: BridgeMessageType.StoreSync, key: this.key };
      window.postMessage(msg, "*");
    } catch {
      // postMessage unavailable (e.g. tests without jsdom) — sync is best-effort
    }
  }

  private listenForSync(): void {
    try {
      window.addEventListener("message", (e: MessageEvent<StoreSyncMessage>) => {
        if (
          e.source !== window ||
          e.data?.type !== BridgeMessageType.StoreSync ||
          e.data.key !== this.key
        ) {
          return;
        }
        // Another realm updated this store — reload from localStorage and notify
        this.reload();
        this.notify();
      });
    } catch {
      // No window (e.g. tests without jsdom) — skip listener registration
    }
  }

  private load(): T {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        return { ...this.defaults, ...(JSON.parse(raw) as Partial<T>) };
      }
    } catch (err) {
      log.error("Failed to load store {key} from localStorage", { key: this.key, error: err });
    }
    return { ...this.defaults };
  }

  private save(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.state));
    } catch (err) {
      log.error("Failed to save store {key} to localStorage", { key: this.key, error: err });
    }
  }
}
