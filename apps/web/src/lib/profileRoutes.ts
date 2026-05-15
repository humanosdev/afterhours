/**
 * In-app path to open a user's profile when you may only have a username or a user id.
 */
export function profileHref(username: string | null | undefined, userId: string): string {
  const u = (username ?? "").trim();
  if (u) return `/u/${encodeURIComponent(u)}`;
  return `/profile/${encodeURIComponent(userId)}`;
}
