import { DEFAULT_SETTINGS } from "./types";
import type { ExtensionSettings } from "./types";
import { ReactiveStore } from "./store";

export const settingsStore = new ReactiveStore<ExtensionSettings>(
  "sc-feed-extension-settings",
  DEFAULT_SETTINGS,
);
