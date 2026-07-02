export type MapLastLocation = {
  lat: number;
  lng: number;
  recordedAtMs: number;
};

let cached: MapLastLocation | null = null;

/** Session memory of last accepted device fix — instant map boot + you-marker seed. */
export function getCachedMapLastLocation(): MapLastLocation | null {
  return cached;
}

export function setCachedMapLastLocation(next: MapLastLocation): void {
  if (
    !Number.isFinite(next.lat) ||
    !Number.isFinite(next.lng) ||
    !Number.isFinite(next.recordedAtMs)
  ) {
    return;
  }
  cached = next;
}

export function clearCachedMapLastLocation(): void {
  cached = null;
}
