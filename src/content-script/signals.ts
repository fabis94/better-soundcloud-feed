import { signal } from "@preact/signals";

/** Whether SC's internal player API has been discovered and is ready. */
export const playerReady = signal(false);
