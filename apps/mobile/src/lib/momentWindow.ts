/** Mirrors web `apps/web/src/lib/momentWindow.ts`. */

export function activeMomentExpiresAtMs(
  created_at: string,
  expires_at: string | null | undefined
): number {
  const createdMs = new Date(created_at).getTime();
  if (!Number.isFinite(createdMs)) return NaN;
  const capMs = createdMs + 24 * 60 * 60 * 1000;
  if (expires_at == null || expires_at === "") return capMs;
  const dbMs = new Date(expires_at).getTime();
  if (!Number.isFinite(dbMs)) return capMs;
  return Math.min(dbMs, capMs);
}

export function isMomentStillActive(
  created_at: string,
  expires_at: string | null | undefined,
  nowMs = Date.now()
): boolean {
  const end = activeMomentExpiresAtMs(created_at, expires_at);
  return Number.isFinite(end) && end > nowMs;
}
