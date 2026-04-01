import { createLogger } from "../../shared/utils/logger";
import { discover } from "../discovery/webpack";

const log = createLogger("pip-keyboard");

type KeyMatcher = (
  e: Pick<KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey">,
) => boolean;

const plain = (key: string): KeyMatcher => {
  const lower = key.toLowerCase();
  return (e) =>
    e.key.toLowerCase() === lower && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
};

const shift = (key: string): KeyMatcher => {
  const lower = key.toLowerCase();
  return (e) =>
    e.key.toLowerCase() === lower && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
};

/** SC keyboard shortcut keyCodes for player controls. */
const KEY_TO_KEYCODE: Record<string, number> = {
  " ": 32,
  ArrowRight: 39,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowDown: 40,
  l: 76,
  m: 77,
  "0": 48,
  "1": 49,
  "2": 50,
  "3": 51,
  "4": 52,
  "5": 53,
  "6": 54,
  "7": 55,
  "8": 56,
  "9": 57,
};

const ALLOWED_KEYS: KeyMatcher[] = [
  plain(" "),
  plain("ArrowRight"),
  plain("ArrowLeft"),
  shift("ArrowRight"),
  shift("ArrowLeft"),
  shift("ArrowUp"),
  shift("ArrowDown"),
  plain("l"),
  plain("m"),
  ...Array.from({ length: 10 }, (_, i) => plain(String(i))),
];

/** Check whether a keyboard event matches a whitelisted SC player shortcut. */
export function isPlayerShortcut(
  e: Pick<KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey">,
): boolean {
  return ALLOWED_KEYS.some((match) => match(e));
}

interface JQuery {
  trigger(event: unknown): void;
}

interface JQueryStatic {
  (selector: unknown): JQuery;
  Event(type: string, props: Record<string, unknown>): unknown;
  fn: { jquery: string };
}

/** Discover jQuery from SC's webpack modules. */
function discoverJQuery(): Promise<JQueryStatic> {
  return discover<JQueryStatic>({
    predicate: (exports) => typeof exports === "function" && !!(exports as JQueryStatic).fn?.jquery,
  });
}

/**
 * Forward whitelisted player-control keydown events from PiP to SC's
 * keyboard handler via jQuery's event system.
 *
 * SC binds its keyboard shortcuts on `document` through jQuery, so native
 * `dispatchEvent` is ignored (jQuery doesn't see it). We trigger through
 * `$(document).trigger($.Event(...))` instead.
 */
export function setupKeyboardForwarding(pipDoc: Document): void {
  let $: JQueryStatic | null = null;

  discoverJQuery().then((jquery) => {
    $ = jquery;
    log.debug("jQuery discovered for PiP keyboard forwarding");
  });

  pipDoc.addEventListener("keydown", (e) => {
    if (!$ || !isPlayerShortcut(e)) return;
    e.preventDefault();

    const keyCode = KEY_TO_KEYCODE[e.key] ?? e.keyCode;
    const eventProps = {
      keyCode,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    };
    // SC's handler tracks state across keydown/keyup (a processed flag and
    // a repeat counter). Sending keydown without keyup leaves that state
    // dirty, which causes the next shortcut press to be ignored.
    $(document).trigger($.Event("keydown", eventProps));
    $(document).trigger($.Event("keyup", eventProps));
  });
}
