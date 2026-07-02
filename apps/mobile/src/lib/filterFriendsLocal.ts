/** PWA `/profile/friends` — `filteredFriends` useMemo (instant local filter, no debounce). */
export function filterFriendsLocal<
  T extends { display_name?: string | null; username?: string | null },
>(friends: T[], rawQuery: string): T[] {
  const q = rawQuery.trim().toLowerCase().replace(/^@/, "");
  if (!q) return friends;
  return friends.filter((f) => {
    const d = (f.display_name ?? "").toLowerCase();
    const u = (f.username ?? "").toLowerCase();
    return d.includes(q) || u.includes(q);
  });
}
