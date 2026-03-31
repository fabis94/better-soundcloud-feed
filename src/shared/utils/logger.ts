import type { LogRecord } from "@logtape/logtape";
import {
  configureSync,
  defaultConsoleFormatter,
  getConsoleSink,
  getLogger,
} from "@logtape/logtape";

declare const __DEV__: boolean;

/** Extends default formatter to append properties as an expandable object. */
function consoleFormatter(record: LogRecord): readonly unknown[] {
  const base = defaultConsoleFormatter(record);
  const props = record.properties;
  if (Object.keys(props).length > 0) {
    return [...base, props];
  }
  return base;
}

configureSync({
  sinks: {
    console: getConsoleSink({ formatter: consoleFormatter }),
  },
  loggers: [
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
    {
      category: ["sc-feed-filter"],
      lowestLevel: __DEV__ ? "debug" : "info",
      sinks: ["console"],
    },
  ],
});

export function createLogger(name: string) {
  return getLogger(["sc-feed-filter", name]);
}
