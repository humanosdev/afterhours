/**
 * Matches web `formatListTime` in `apps/web/src/app/chat/page.tsx` (not imported).
 */
export function formatChatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (!Number.isFinite(date.getTime())) return "";

  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
