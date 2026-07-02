/** PWA `apps/web/src/app/chat/[id]/page.tsx` — `formatMessageTimestamp`. */
export function formatMessageTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
