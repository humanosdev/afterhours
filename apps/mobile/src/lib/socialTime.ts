/** Instagram-style relative time — matches `formatSocialAgo` in `apps/web/src/lib/time.ts`. */
export function formatSocialAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 8) {
    if (weeks === 1) return "1 week ago";
    return `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    if (months <= 1) return "1 month ago";
    return `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}
