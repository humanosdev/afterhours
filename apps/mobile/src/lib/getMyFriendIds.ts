import { fetchAcceptedFriends } from "./fetchAcceptedFriends";

export async function getMyFriendIds(userId: string): Promise<string[]> {
  const { friends, error } = await fetchAcceptedFriends(userId);
  if (error) return [];
  return friends.map((f) => f.id);
}
