/** PWA `apps/web/src/lib/time.ts` — shared relative time copy. */
export function formatRelativeTime(
  iso: string,
  options?: {
    nowLabel?: string;
    includeAgo?: boolean;
  }
): string {
  const nowLabel = options?.nowLabel ?? "just now";
  const includeAgo = options?.includeAgo ?? false;

  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return nowLabel;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return nowLabel;
  if (minutes < 60) return `${minutes}m${includeAgo ? " ago" : ""}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${includeAgo ? " ago" : ""}`;

  const days = Math.floor(hours / 24);
  const dayLabel = days === 1 ? "day" : "days";
  return `${days} ${dayLabel}${includeAgo ? " ago" : ""}`;
}

/** PWA map marker + friends panel — `formatLastSeen` in `map/page.tsx`. */
export function formatMapLastSeen(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 2) return "online";
  return formatRelativeTime(ts, { includeAgo: false, nowLabel: "online" });
}

/** Compact tag under map avatar — fits without ellipsis (`2d`, `5h`, not `3 days`). */
export function formatMapMarkerLastSeen(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "now";
  const min = Math.floor(diff / 60_000);
  if (min < 2) return "now";
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
