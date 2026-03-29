import { openModal } from "../modal";
import { settingsStore } from "../../shared/settings-store";
import { DEFAULT_SETTINGS } from "../../shared/types";
import type { ExtensionSettings } from "../../shared/types";
import settingsIcon from "./icons/settings.svg?raw";

export const SETTINGS_BTN_ID = "scf-settings-btn";
const SETTINGS_MODAL_ID = "scf-settings-modal";

/** Create the settings gear element for the player bar. */
export function createSettingsButton(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = SETTINGS_BTN_ID;
  el.className = "scf-settings-btn";
  el.innerHTML = settingsIcon;
  el.title = "Better SC Feed Playback settings";
  el.addEventListener("click", openSettingsModal);
  return el;
}

/** Update settings element disabled state based on player readiness. */
export function updateSettingsButton(el: HTMLElement, playerReady: boolean): void {
  el.classList.toggle("scf-btn-disabled", !playerReady);
}

function readSettingsFromUI(container: HTMLElement): ExtensionSettings | null {
  const toggle = container.querySelector<HTMLInputElement>("#scf-setting-skip-forward");
  const secondsInput = container.querySelector<HTMLInputElement>("#scf-setting-skip-seconds");
  if (!toggle || !secondsInput) return null;

  const val = parseInt(secondsInput.value, 10);
  return {
    skipForwardEnabled: toggle.checked,
    skipForwardSeconds: val > 0 ? val : settingsStore.get("skipForwardSeconds"),
  };
}

function restoreSettingsToUI(container: HTMLElement, settings: ExtensionSettings): void {
  const toggle = container.querySelector<HTMLInputElement>("#scf-setting-skip-forward");
  const secondsInput = container.querySelector<HTMLInputElement>("#scf-setting-skip-seconds");
  if (!toggle || !secondsInput) return;

  toggle.checked = settings.skipForwardEnabled;
  secondsInput.value = String(settings.skipForwardSeconds);
}

function openSettingsModal(): void {
  const container = openModal({
    id: SETTINGS_MODAL_ID,
    title: "Better SC Feed Playback Settings",
    content: `
      <section class="scf-modal-section">
        <h3>Seek Forward</h3>
        <label class="scf-toggle-row">
          <span>Enable Skip Forward Button</span>
          <input type="checkbox" class="scf-toggle" id="scf-setting-skip-forward">
        </label>
        <label class="scf-toggle-row">
          <span>Seconds to seek forward</span>
          <input type="number" class="scf-input scf-input-small"
                 id="scf-setting-skip-seconds" min="1" max="300" step="1">
        </label>
      </section>
      <div class="scf-actions">
        <button type="button" class="scf-btn scf-btn-primary" id="scf-settings-apply">Apply</button>
        <button type="button" class="scf-btn scf-btn-secondary" id="scf-settings-reset">Reset</button>
        <button type="button" class="scf-btn scf-btn-secondary" id="scf-settings-cancel">Cancel</button>
      </div>
    `,
  });

  if (!container) return;

  restoreSettingsToUI(container, settingsStore.get());

  container.querySelector<HTMLElement>("#scf-settings-apply")!.addEventListener("click", () => {
    const settings = readSettingsFromUI(container);
    if (settings) settingsStore.update(settings);
    container.remove();
  });

  container.querySelector<HTMLElement>("#scf-settings-reset")!.addEventListener("click", () => {
    restoreSettingsToUI(container, DEFAULT_SETTINGS);
  });

  container.querySelector<HTMLElement>("#scf-settings-cancel")!.addEventListener("click", () => {
    container.remove();
  });
}
