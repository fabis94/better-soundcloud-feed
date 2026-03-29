// Extend MediaSessionAction to include "enterpictureinpicture" (Chrome 120+)
interface MediaSessionActionMap {
  enterpictureinpicture: MediaSessionActionHandler | null;
}

interface MediaSession {
  setActionHandler(
    action: "enterpictureinpicture",
    handler: MediaSessionActionHandler | null,
  ): void;
}

interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  readonly window: Window | null;
}

// eslint-disable-next-line no-var -- ambient global
declare var documentPictureInPicture: DocumentPictureInPicture;
