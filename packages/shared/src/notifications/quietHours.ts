/** Parse `HH:MM` or `HH:MM:SS` into minutes since midnight (local). */
export function parseClockToMinutes(raw: string | null | undefined): number | null {
  const s = raw?.trim();
  if (!s) return null;
  const parts = s.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

/**
 * True when `now` falls inside quiet window. Supports overnight windows (e.g. 22:00–07:00).
 */
export function isWithinQuietHours(
  quietStart: string | null | undefined,
  quietEnd: string | null | undefined,
  now: Date = new Date()
): boolean {
  const startM = parseClockToMinutes(quietStart);
  const endM = parseClockToMinutes(quietEnd);
  if (startM == null || endM == null) return false;
  if (startM === endM) return false;

  const nowM = now.getHours() * 60 + now.getMinutes();

  if (startM < endM) {
    return nowM >= startM && nowM < endM;
  }
  return nowM >= startM || nowM < endM;
}
