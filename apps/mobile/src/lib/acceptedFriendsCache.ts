import type { AcceptedFriendPublic } from "../types/friend";

const cache = new Map<string, AcceptedFriendPublic[]>();

export function getCachedAcceptedFriends(userId: string): AcceptedFriendPublic[] | null {
  return cache.get(userId) ?? null;
}

export function setCachedAcceptedFriends(userId: string, friends: AcceptedFriendPublic[]): void {
  cache.set(userId, friends);
}

export function clearCachedAcceptedFriends(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}
