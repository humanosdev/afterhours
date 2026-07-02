import type { UserPresenceRow } from "../types/presence";

/** Only me + accepted friends; never blocked users (PWA `hiddenIds` + friends list). */
export function filterPresenceForSocialGraph(
  rows: UserPresenceRow[],
  meId: string | null,
  friendIds: Set<string>,
  blockedUserIds: Set<string>
): UserPresenceRow[] {
  if (!meId) return [];
  return rows.filter((p) => {
    if (!p.user_id) return false;
    if (blockedUserIds.has(p.user_id)) return false;
    if (p.user_id === meId) return true;
    return friendIds.has(p.user_id);
  });
}

export function canShowPresenceUser(
  userId: string,
  meId: string | null,
  friendIds: Set<string>,
  blockedUserIds: Set<string>
): boolean {
  if (!meId) return false;
  if (blockedUserIds.has(userId)) return false;
  if (userId === meId) return true;
  return friendIds.has(userId);
}
