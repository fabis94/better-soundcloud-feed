import { render, type VNode } from "preact";
import type { BridgeMessage } from "../../shared/types";
import { settingsStore } from "../../shared/settings-store";
import { playerReady, pipSupported } from "../signals";
import { SeekButton } from "../components/SeekButton";
import { SettingsButton } from "../components/SettingsButton";

const CONTROLS_ID = "scf-player-controls-injected";

let listenerRegistered = false;

interface ControlSlot {
  id: string;
  anchor: string;
  position: "before" | "after";
  render: () => VNode;
}

function getSlots(): ControlSlot[] {
  const ready = playerReady.value;
  const seekVisible = settingsStore.get("seekEnabled");

  return [
    {
      id: "scf-settings-btn",
      anchor: ".playControls__timeline",
      position: "after",
      render: () => <SettingsButton disabled={!ready} />,
    },
    {
      id: "scf-seek-bwd",
      anchor: ".playControls__prev",
      position: "before",
      render: () => (
        <SeekButton direction="seekBackward" visible={seekVisible} playerReady={ready} />
      ),
    },
    {
      id: "scf-seek-fwd",
      anchor: ".playControls__next",
      position: "after",
      render: () => (
        <SeekButton direction="seekForward" visible={seekVisible} playerReady={ready} />
      ),
    },
  ];
}

function renderAll(): void {
  for (const slot of getSlots()) {
    const container = document.getElementById(slot.id);
    if (container) render(slot.render(), container);
  }
}

function onPlayerReady(): void {
  playerReady.value = true;
  renderAll();
}

function onPipSupported(): void {
  pipSupported.value = true;
}

function registerListeners(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;

  if (document.documentElement.dataset["scfPlayerReady"] === "true") {
    onPlayerReady();
  }
  if (document.documentElement.dataset["scfPipSupported"] === "true") {
    onPipSupported();
  }

  window.addEventListener("message", (e: MessageEvent<BridgeMessage>) => {
    if (e.source !== window) return;
    if (e.data?.type === "SC_PLAYER_READY") onPlayerReady();
    if (e.data?.type === "SC_PIP_SUPPORTED") onPipSupported();
  });

  settingsStore.subscribe(() => renderAll());
}

function insertAfter(parent: Element, newChild: Element, reference: Element | null): void {
  if (reference?.nextSibling) {
    parent.insertBefore(newChild, reference.nextSibling);
  } else {
    parent.appendChild(newChild);
  }
}

/**
 * Inject extension controls into SC's player bar.
 * Idempotent — short-circuits if already injected. Called from MutationObserver.
 */
export function injectPlayerControls(): boolean {
  registerListeners();

  if (document.getElementById(CONTROLS_ID)) return true;

  const elements = document.querySelector(".playControls__elements");
  if (!elements) return false;

  const sentinel = document.createElement("span");
  sentinel.id = CONTROLS_ID;
  sentinel.hidden = true;
  elements.appendChild(sentinel);

  for (const slot of getSlots()) {
    const container = document.createElement("span");
    container.id = slot.id;

    const anchor = elements.querySelector(slot.anchor);
    if (slot.position === "before" && anchor) {
      elements.insertBefore(container, anchor);
    } else {
      insertAfter(elements, container, anchor);
    }

    render(slot.render(), container);
  }

  return true;
}
