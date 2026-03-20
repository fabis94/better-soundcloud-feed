import { configureSync, getConsoleSink, getLogger } from "@logtape/logtape";

declare const __DEV__: boolean;

configureSync({
  sinks: {
    console: getConsoleSink(),
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

const rootLogger = getLogger(["sc-feed-filter"]);
rootLogger.info("SC Feed Filter started (mode: {mode})", { mode: __DEV__ ? "dev" : "prod" });

export function createLogger(name: string) {
  return getLogger(["sc-feed-filter", name]);
}
