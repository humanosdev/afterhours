import type { MyProfile } from "../types/profile";

export type ProfileNameFields = {
  username?: string | null;
  display_name?: string | null;
};

/** Social surfaces — always `profiles.username`, never display_name (PWA parity). */
export function profileUsernameLabel(
  profile: ProfileNameFields | null | undefined,
  fallback = "user"
): string {
  const u = profile?.username?.trim().replace(/^@/, "");
  return u || fallback;
}

/** Profile header / edit — display name when set, else @username. */
export function profileDisplayName(profile: MyProfile | null): string | null {
  const display = profile?.display_name?.trim();
  if (display) return display;
  const username = profile?.username?.trim();
  if (username) return `@${username.replace(/^@/, "")}`;
  return null;
}

export function profileAvatarLabel(
  profile: MyProfile | null,
  fallbackEmail: string | null | undefined
): string {
  const username = profileUsernameLabel(profile, "");
  if (username) return username;
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
