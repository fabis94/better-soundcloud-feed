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

/** Format an ISO date string as a human-readable relative time (e.g. "5d ago"). */
export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (days < 60) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
