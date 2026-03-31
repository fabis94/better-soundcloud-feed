import { settingsStore } from "../../shared/stores/settings-store";

export type SeekAction = "seek" | "skipNext" | "skipPrev";

/** Pure decision logic: determine whether to seek or skip based on position/duration. */
export function resolveSeekAction(
  position: number,
  duration: number,
  amount: number,
  direction: 1 | -1,
): SeekAction {
  if (direction === 1 && duration > 0 && position + amount > duration * 0.9) return "skipNext";
  if (direction === -1 && duration > 0 && position - amount < duration * 0.1) return "skipPrev";
  return "seek";
}

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

  const action = resolveSeekAction(position, duration, amount, direction);
  switch (action) {
    case "skipNext":
      window.scPlayer?.playNext?.();
      break;
    case "skipPrev":
      window.scPlayer?.playPrev?.();
      break;
    case "seek":
      window.scPlayer?.seekCurrentBy?.(() => direction * amount);
      break;
  }
}
