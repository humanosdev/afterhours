export type FriendRequestNotificationPreview = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export function decodeFriendRequestNotificationPreview(
  raw: string | null | undefined
): FriendRequestNotificationPreview {
  if (!raw?.trim()) return {};
  try {
    const o = JSON.parse(raw) as { dn?: unknown; un?: unknown; av?: unknown };
    return {
      display_name: typeof o.dn === "string" ? o.dn : null,
      username: typeof o.un === "string" ? o.un : null,
      avatar_url: typeof o.av === "string" ? o.av : null,
    };
  } catch {
    return {};
  }
}

export function encodeFriendRequestNotificationPreview(
  p: FriendRequestNotificationPreview
): string | null {
  const payload = {
    dn: p.display_name?.trim() || null,
    un: p.username?.trim() || null,
    av: p.avatar_url?.trim() || null,
  };
  if (!payload.dn && !payload.un && !payload.av) return null;
  return JSON.stringify(payload);
}
