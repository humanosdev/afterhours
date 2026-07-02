import { useRef } from "react";
import { resolveAvatarUri } from "../lib/avatar";
import { profileAvatarLabel, profileDisplayName, profileUsernameLabel } from "../lib/profileDisplay";
import { useAuth } from "../providers/AuthProvider";
import { useMyProfile } from "./useMyProfile";

/**
 * Canonical signed-in user avatar + label for tab bar, hub own-moment, profile, etc.
 */
export function useMyAvatar() {
  const { user } = useAuth();
  const { profile, loading, error } = useMyProfile(user?.id);
  const lastAvatarRef = useRef<string | null>(null);

  const resolved = resolveAvatarUri(profile?.avatar_url);
  if (resolved) {
    lastAvatarRef.current = resolved;
  } else if (!loading && profile != null) {
    lastAvatarRef.current = null;
  }
  const avatarUrl = resolved ?? (loading ? lastAvatarRef.current : null);

  const label = profileAvatarLabel(profile, user?.email);
  const displayName = profileDisplayName(profile);

  return {
    userId: user?.id,
    profile,
    loading,
    error,
    avatarUrl,
    /** True when we have (or had) a profile image — tab bar avoids User-icon flash. */
    showProfileAvatar: Boolean(avatarUrl),
    label,
    displayName,
    username: profileUsernameLabel(profile, user?.email?.split("@")[0] ?? "you"),
  };
}
