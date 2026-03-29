import { createLogger } from "../shared/logger";

const log = createLogger("pip");

let autoPipEnabled = false;

async function openPipWindow(): Promise<void> {
  if (!("documentPictureInPicture" in window)) return;

  if (documentPictureInPicture.window) {
    documentPictureInPicture.window.focus();
    return;
  }

  const pipWindow = await documentPictureInPicture.requestWindow({
    width: 400,
    height: 200,
  });

  pipWindow.document.body.innerHTML =
    "<h1 style='font-family: sans-serif; text-align: center; margin-top: 60px;'>Hello World</h1>";
  log.info("PiP window opened");
}

function closePipWindow(): void {
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
