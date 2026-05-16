/**
 * Normalize `stories.is_share` from PostgREST/JSON — same rules as
 * `apps/web/src/lib/storyRowShare.ts` (not imported).
 */

export function isStoryRowShareFlag(raw: unknown): boolean {
  if (raw === true) return true;
  if (raw === 1) return true;
  if (typeof raw === "string") {
    const t = raw.trim().toLowerCase();
    return t === "true" || t === "t" || t === "1";
  }
  return false;
}
