/** Profile fields required before first app entry after auth. */

export type ProfileOnboardingSnapshot = {
  display_name: string | null;
  username: string | null;
  onboarding_complete: boolean | null;
};

export const MIN_DISPLAY_NAME_LENGTH = 1;
export const MIN_USERNAME_LENGTH = 3;

export function hasRequiredDisplayName(displayName: string | null | undefined): boolean {
  return (displayName?.trim().length ?? 0) >= MIN_DISPLAY_NAME_LENGTH;
}

export function hasRequiredUsername(username: string | null | undefined): boolean {
  return (username?.trim().length ?? 0) >= MIN_USERNAME_LENGTH;
}

export function profileMissingRequiredFields(
  profile: ProfileOnboardingSnapshot | null | undefined
): boolean {
  if (!profile) return true;
  return !hasRequiredDisplayName(profile.display_name) || !hasRequiredUsername(profile.username);
}

/** True when the user must stay on onboarding (missing identity or flag not set). */
export function needsProfileOnboarding(
  profile: ProfileOnboardingSnapshot | null | undefined
): boolean {
  if (!profile) return true;
  if (profileMissingRequiredFields(profile)) return true;
  return !profile.onboarding_complete;
}
