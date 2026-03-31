import { DEFAULT_SETTINGS } from "../types";
import type { ExtensionSettings } from "../types";
import { ReactiveStore } from "./reactive-store";

export const settingsStore = new ReactiveStore<ExtensionSettings>(
  "bscf_settings",
  DEFAULT_SETTINGS,
);
