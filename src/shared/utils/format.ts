/** Format milliseconds as "M:SS" (e.g. 125000 → "2:05"). */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Transform SC artwork URL to a higher resolution variant. */
export function getArtworkUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace("-large", "-t300x300");
}
