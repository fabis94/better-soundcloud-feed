import { signal } from "@preact/signals";

/** Whether SC's internal player API has been discovered and is ready. */
export const playerReady = signal(false);

/** Whether the browser supports the Document Picture-in-Picture API. */
export const pipSupported = signal(false);
