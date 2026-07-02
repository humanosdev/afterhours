/**
 * Map presence marker glide — frame-rate independent, Maps / Find My–style follow.
 * PWA uses fixed α=0.18 per frame (~88ms time constant at 60Hz); we use explicit τ for 120Hz parity.
 * @see apps/web/src/app/map/page.tsx `PRESENCE_MARKER_SMOOTH_ALPHA`
 */

/**
 * Time constant (ms) — lower = snappier.
 * ~180ms gives a visible glide between sparse presence polls (Find My–style catch-up).
 */
export const PRESENCE_MARKER_SMOOTH_MS = 180;

/** EVOLVE-3 — above brisk walk, snap marker instead of gliding (subway / WiFi jumps). */
export const MAX_MARKER_GLIDE_SPEED_MPS = 8;

/** Instant snap beyond this delta (degrees) — venue hops / bad rows. */
export const PRESENCE_MARKER_SNAP_DEG = 0.012;

/** GPS jitter under ~1m — lock without visible lag. */
const MICRO_SNAP_DEG = 3e-6;

type SmoothPoint = { lng: number; lat: number; /** Stable ref for `useSyncExternalStore`. */ coord: [number, number] };

const targets = new Map<string, [number, number]>();
const targetTimestamps = new Map<string, number>();
const smooth = new Map<string, SmoothPoint>();
/** Fallback tuples before smooth init — must keep referential equality when coords unchanged. */
const fallbackCoords = new Map<string, [number, number]>();
const listeners = new Set<() => void>();
let lastTickMs = 0;

function writeCoord(s: SmoothPoint, lng: number, lat: number): void {
  if (s.lng === lng && s.lat === lat) return;
  s.lng = lng;
  s.lat = lat;
  s.coord = [lng, lat];
}

function ensureSmooth(userId: string, lng: number, lat: number): SmoothPoint {
  let s = smooth.get(userId);
  if (!s) {
    s = { lng, lat, coord: [lng, lat] };
    smooth.set(userId, s);
    fallbackCoords.delete(userId);
  }
  return s;
}

function emit(): void {
  for (const cb of listeners) {
    cb();
  }
}

function blendForDeltaMs(dtMs: number): number {
  return 1 - Math.exp(-dtMs / PRESENCE_MARKER_SMOOTH_MS);
}

export function subscribePresenceMarkerMotion(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function impliedSpeedMps(
  prevLng: number,
  prevLat: number,
  lng: number,
  lat: number,
  dtMs: number
): number {
  if (dtMs <= 0) return 0;
  const latRad = (lat * Math.PI) / 180;
  const safeCos = Math.max(0.2, Math.cos(latRad));
  const dLatM = (lat - prevLat) * 111_320;
  const dLngM = (lng - prevLng) * 111_320 * safeCos;
  return Math.hypot(dLngM, dLatM) / (dtMs / 1000);
}

/** Set fly-to target; smooth position is advanced only in `tickPresenceMarkerMotion`. */
export function setPresenceMarkerTarget(
  userId: string,
  lng: number,
  lat: number,
  nowMs = Date.now()
): void {
  const prev = targets.get(userId);
  const prevAt = targetTimestamps.get(userId);
  targets.set(userId, [lng, lat]);
  targetTimestamps.set(userId, nowMs);

  if (prev && prevAt != null) {
    const speed = impliedSpeedMps(prev[0], prev[1], lng, lat, nowMs - prevAt);
    if (speed > MAX_MARKER_GLIDE_SPEED_MPS) {
      const s = smooth.get(userId);
      if (s) {
        writeCoord(s, lng, lat);
        emit();
      }
    }
  }

  if (!smooth.has(userId)) {
    writeCoord(ensureSmooth(userId, lng, lat), lng, lat);
    emit();
    return;
  }
  if (prev && (prev[0] !== lng || prev[1] !== lat)) {
    emit();
  }
}

export function removePresenceMarkerTarget(userId: string): void {
  targets.delete(userId);
  targetTimestamps.delete(userId);
  smooth.delete(userId);
  fallbackCoords.delete(userId);
  emit();
}

export function prunePresenceMarkerTargets(activeUserIds: Iterable<string>): void {
  const active = new Set(activeUserIds);
  for (const id of smooth.keys()) {
    if (!active.has(id)) {
      targets.delete(id);
      targetTimestamps.delete(id);
      smooth.delete(id);
      fallbackCoords.delete(id);
    }
  }
}

export function getPresenceMarkerCoordinate(userId: string): [number, number] | null {
  const s = smooth.get(userId);
  if (!s) return null;
  return s.coord;
}

/** Stable snapshot for `useSyncExternalStore` before / without smooth state. */
export function getPresenceMarkerSnapshot(
  userId: string,
  fallbackLng: number,
  fallbackLat: number
): [number, number] {
  const s = smooth.get(userId);
  if (s) return s.coord;

  let fb = fallbackCoords.get(userId);
  if (!fb) {
    fb = [fallbackLng, fallbackLat];
    fallbackCoords.set(userId, fb);
    return fb;
  }
  if (fb[0] !== fallbackLng || fb[1] !== fallbackLat) {
    fb = [fallbackLng, fallbackLat];
    fallbackCoords.set(userId, fb);
  }
  return fb;
}

/** Single rAF driver — call once per frame from `VenuesMapCanvas`. */
export function tickPresenceMarkerMotion(nowMs = Date.now()): void {
  const dt =
    lastTickMs > 0 ? Math.min(48, Math.max(1, nowMs - lastTickMs)) : 16;
  lastTickMs = nowMs;
  const k = blendForDeltaMs(dt);

  let moved = false;
  for (const [id, t] of targets) {
    let s = smooth.get(id);
    if (!s) {
      writeCoord(ensureSmooth(id, t[0], t[1]), t[0], t[1]);
      moved = true;
      continue;
    }

    const dLng = t[0] - s.lng;
    const dLat = t[1] - s.lat;
    const dist = Math.hypot(dLng, dLat);
    if (dist < MICRO_SNAP_DEG) continue;

    if (dist > PRESENCE_MARKER_SNAP_DEG) {
      writeCoord(s, t[0], t[1]);
    } else {
      writeCoord(s, s.lng + dLng * k, s.lat + dLat * k);
    }
    moved = true;
  }

  if (moved) emit();
}
