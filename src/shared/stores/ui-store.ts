import type { UiState } from "../types";
import { DEFAULT_UI_STATE } from "../types";
import { ReactiveStore } from "./reactive-store";

/** UI preferences (e.g. accordion state). Instant-apply, like settings. */
export const uiStore = new ReactiveStore<UiState>("bscf_ui", DEFAULT_UI_STATE);
