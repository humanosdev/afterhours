/** EVOLVE-4 — cross-provider resume / push wake for presence reads (no writes). */

const listeners = new Set<() => void>();

export function subscribePresenceResumeRequest(onRequest: () => void): () => void {
  listeners.add(onRequest);
  return () => listeners.delete(onRequest);
}

export function requestPresenceResume(): void {
  for (const fn of listeners) {
    fn();
  }
}
