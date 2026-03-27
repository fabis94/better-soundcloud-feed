import { DEFAULT_SETTINGS } from "./types";
import type { ExtensionSettings } from "./types";
import { ReactiveStore } from "./store";

export const settingsStore = new ReactiveStore<ExtensionSettings>(
  "bscf_settings",
  DEFAULT_SETTINGS,
);
