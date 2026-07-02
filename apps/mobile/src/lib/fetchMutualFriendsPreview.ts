import type { AcceptedFriendPublic } from "../types/friend";
import { fetchAcceptedFriends } from "./fetchAcceptedFriends";

export type MutualFriendsPreviewResult = {
  preview: AcceptedFriendPublic[];
  total: number;
};

/**
 * Intersection of accepted friends for viewer + profile owner — mirrors PWA `/u/[username]` mutual strip.
 */
export async function fetchMutualFriendsPreview(
  meId: string,
  themId: string
): Promise<MutualFriendsPreviewResult> {
  const [{ friends: myFriends }, { friends: theirFriends }] = await Promise.all([
    fetchAcceptedFriends(meId),
    fetchAcceptedFriends(themId),
  ]);

  const theirSet = new Set(theirFriends.map((f) => f.id));
  const mutual = myFriends.filter(
    (f) => theirSet.has(f.id) && f.id !== meId && f.id !== themId
  );

  mutual.sort((a, b) => a.id.localeCompare(b.id));

  return {
    preview: mutual.slice(0, 2),
    total: mutual.length,
  };
}
