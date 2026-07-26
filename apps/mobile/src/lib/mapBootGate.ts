type MapBootGateListener = () => void;

let mapBootReady = false;
const listeners = new Set<MapBootGateListener>();

export function isMapBootReady(): boolean {
  return mapBootReady;
}

export function markMapBootReady(): void {
  if (mapBootReady) return;
  mapBootReady = true;
  for (const listener of listeners) listener();
}

export function resetMapBootGate(): void {
  if (!mapBootReady) return;
  mapBootReady = false;
  for (const listener of listeners) listener();
}

/** Root boot overlay — release when map reveal completes. */
export function subscribeMapBootGate(listener: MapBootGateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
