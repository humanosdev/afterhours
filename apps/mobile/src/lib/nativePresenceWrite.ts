/** Phase 2 — native write cadence (map focus 3s · other tabs 5s). */
export const NATIVE_PRESENCE_WRITE_MAP_MS = 3_000;
export const NATIVE_PRESENCE_WRITE_SHELL_MS = 5_000;

/** Part 2 pre-prep — burst write on meaningful GPS movement (min spacing). */
export const NATIVE_PRESENCE_WRITE_MOVE_MIN_MS = 2_000;
export const NATIVE_PRESENCE_WRITE_MOVE_THRESHOLD_M = 8;

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Heartbeat at intervalMs, or early when moved ≥ threshold after moveMinMs. */
export function shouldWritePresenceForFix(args: {
  fix: { lat: number; lng: number };
  lastWritten: { lat: number; lng: number } | null;
  lastWriteAtMs: number;
  heartbeatMs: number;
  nowMs?: number;
}): boolean {
  const now = args.nowMs ?? Date.now();
  if (args.lastWriteAtMs === 0) return true;
  if (now - args.lastWriteAtMs >= args.heartbeatMs) return true;
  if (!args.lastWritten) return true;
  if (now - args.lastWriteAtMs < NATIVE_PRESENCE_WRITE_MOVE_MIN_MS) return false;
  return (
    distanceMeters(args.fix.lat, args.fix.lng, args.lastWritten.lat, args.lastWritten.lng) >=
    NATIVE_PRESENCE_WRITE_MOVE_THRESHOLD_M
  );
}
