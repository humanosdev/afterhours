export function formatRelativeTime(
  iso: string,
  options?: {
    nowLabel?: string;
    includeAgo?: boolean;
  }
) {
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
