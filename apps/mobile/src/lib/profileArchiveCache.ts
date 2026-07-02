import type { ProfileArchiveRow } from "./fetchProfileArchive";

const cache = new Map<string, ProfileArchiveRow[]>();

export function getCachedProfileArchive(userId: string): ProfileArchiveRow[] | null {
  return cache.get(userId) ?? null;
}

export function setCachedProfileArchive(userId: string, rows: ProfileArchiveRow[]): void {
  cache.set(userId, rows);
}

export function clearCachedProfileArchive(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}
