import type { ProfileShareRow } from "./fetchProfileShares";

type ProfileSharesCacheEntry = {
  rows: ProfileShareRow[];
  count: number;
};

const cache = new Map<string, ProfileSharesCacheEntry>();

export function getCachedProfileShares(userId: string): ProfileSharesCacheEntry | null {
  return cache.get(userId) ?? null;
}

export function setCachedProfileShares(userId: string, rows: ProfileShareRow[], count: number): void {
  cache.set(userId, { rows, count });
}

export function clearCachedProfileShares(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}
