import { settingsStore } from "../shared/settings-store";

/**
 * Seek forward or backward by the configured amount.
 * If near the track boundary (within 10% start or 90% end), skips to prev/next instead.
 */
export function seekOrSkip(direction: 1 | -1): void {
  const sound = window.scPlayer?.getCurrentSound?.();
  if (!sound) return;
  const position = sound.player?.getPosition?.() ?? 0;
  const duration = sound.player?.getDuration?.() ?? 0;
  const amount = settingsStore.get("seekSeconds") * 1000;

  if (direction === 1 && duration > 0 && position + amount > duration * 0.9) {
    window.scPlayer?.playNext?.();
  } else if (direction === -1 && duration > 0 && position - amount < duration * 0.1) {
    window.scPlayer?.playPrev?.();
  } else {
    window.scPlayer?.seekCurrentBy?.(() => direction * amount);
  }
}
