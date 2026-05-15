import type { MyProfile } from "../types/profile";

export function profileDisplayName(profile: MyProfile | null): string | null {
  const display = profile?.display_name?.trim();
  if (display) return display;
  const username = profile?.username?.trim();
  if (username) return `@${username}`;
  return null;
}

export function profileAvatarLabel(
  profile: MyProfile | null,
  fallbackEmail: string | null | undefined
): string {
  const display = profileDisplayName(profile);
  if (display) return display.replace(/^@/, "");
  const email = fallbackEmail?.trim();
  if (email) return email.split("@")[0] ?? email;
  return "?";
}

export function profileInitials(label: string): string {
  const parts = label.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
