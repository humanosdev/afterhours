import type { UserPresenceRow } from "../types/presence";

let cachedPresence: UserPresenceRow[] | null = null;

export function getCachedPresencePreview(): UserPresenceRow[] | null {
  return cachedPresence;
}

export function setCachedPresencePreview(rows: UserPresenceRow[]): void {
  cachedPresence = rows;
}

export function clearCachedPresencePreview(): void {
  cachedPresence = null;
}
