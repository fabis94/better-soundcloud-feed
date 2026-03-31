import { createLogger } from "../../shared/utils/logger";
import { buildPipDocument, type PipController } from "./ui";

const log = createLogger("pip");

let autoPipEnabled = false;
let controller: PipController | null = null;

async function openPipWindow(): Promise<void> {
  if (!("documentPictureInPicture" in window)) return;

  if (documentPictureInPicture.window) {
    documentPictureInPicture.window.focus();
    return;
  }

  const pipWindow = await documentPictureInPicture.requestWindow({
    width: 360,
    height: 480,
  });

  controller = buildPipDocument(pipWindow);
  controller.startPolling();

  pipWindow.addEventListener("pagehide", () => {
    controller?.stopPolling();
    controller = null;
  });

  log.info("PiP window opened");
}

function closePipWindow(): void {
  controller?.stopPolling();
  controller = null;
  documentPictureInPicture.window?.close();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    closePipWindow();
  }
}

export function setupAutoPip(enabled: boolean): void {
  if (enabled === autoPipEnabled) return;
  autoPipEnabled = enabled;

  if (!("documentPictureInPicture" in window)) return;

  if (enabled) {
    try {
      navigator.mediaSession.setActionHandler("enterpictureinpicture", () => {
        openPipWindow();
      });
      document.addEventListener("visibilitychange", onVisibilityChange);
      log.info("Auto PiP enabled");
    } catch {
      log.warn("Browser does not support enterpictureinpicture media session action");
    }
  } else {
    try {
      navigator.mediaSession.setActionHandler("enterpictureinpicture", null);
    } catch {
      // ignore — action may not be supported
    }
    document.removeEventListener("visibilitychange", onVisibilityChange);
    log.info("Auto PiP disabled");
  }
}
