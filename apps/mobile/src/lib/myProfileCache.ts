import type { MyProfile } from "../types/profile";
import { emitProfileUpdated } from "./profileSyncEvents";

const cache = new Map<string, MyProfile>();

export function getCachedMyProfile(userId: string): MyProfile | null {
  return cache.get(userId) ?? null;
}

export function setCachedMyProfile(userId: string, profile: MyProfile, opts?: { silent?: boolean }): void {
  cache.set(userId, profile);
  if (!opts?.silent) emitProfileUpdated();
}

export function clearCachedMyProfile(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}
