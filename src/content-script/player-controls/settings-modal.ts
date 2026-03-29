import { openModal } from "../modal";
import { settingsStore } from "../../shared/settings-store";
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
    `,
  });

  if (!container) return;

  const toggle = container.querySelector<HTMLInputElement>("#scf-setting-skip-forward")!;
  toggle.checked = settingsStore.get("skipForwardEnabled");

  toggle.addEventListener("change", () => {
    settingsStore.update({ skipForwardEnabled: toggle.checked });
  });

  const secondsInput = container.querySelector<HTMLInputElement>("#scf-setting-skip-seconds")!;
  secondsInput.value = String(settingsStore.get("skipForwardSeconds"));

  secondsInput.addEventListener("change", () => {
    const val = parseInt(secondsInput.value, 10);
    if (val > 0) {
      settingsStore.update({ skipForwardSeconds: val });
    }
  });
}
