import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";
import { ProfileDetailRow } from "../../src/components/ProfileDetailRow";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";
import { useMyProfile } from "../../src/hooks/useMyProfile";
import { profileAvatarLabel, profileDisplayName } from "../../src/lib/profileDisplay";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

export default function ProfileTabScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading, error: profileError } = useMyProfile(user?.id);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const displayName = profileDisplayName(profile);
  const avatarLabel = profileAvatarLabel(profile, user?.email);
  const hasProfileRow = Boolean(profile);
  const username = profile?.username?.trim() ?? null;
  const bio = profile?.bio?.trim() ?? null;

  const profileDetailRows: Array<{ label: string; value: string }> = [];
  if (username) profileDetailRows.push({ label: "Username", value: `@${username}` });
  if (profile?.display_name?.trim()) {
    profileDetailRows.push({ label: "Display name", value: profile.display_name.trim() });
  }
  if (bio) profileDetailRows.push({ label: "Bio", value: bio });

  async function onSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : "Sign out failed.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Profile"
        phaseLabel="Phase 2H · Profile"
        subtitle="Read-only profiles hydration (2F). Edit on web/PWA; no presence or location on mobile."
      />

      {loading ? (
        <ShellCard title="Loading profile" style={styles.cardSpacing}>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Fetching your profile…</Text>
          </View>
        </ShellCard>
      ) : null}

      {!loading && profileError ? (
        <ShellCard title="Could not load profile" style={styles.cardSpacing}>
          <Text style={styles.muted}>{profileError}</Text>
          <Text style={styles.mutedSmall}>Showing auth account details below.</Text>
        </ShellCard>
      ) : null}

      {!loading && !profileError && !hasProfileRow ? (
        <ShellCard title="No profile row yet" style={styles.cardSpacing}>
          <Text style={styles.muted}>
            No matching row in profiles for this account. Complete onboarding on web/PWA, or use the
            auth details below.
          </Text>
        </ShellCard>
      ) : null}

      {!loading && hasProfileRow ? (
        <ShellCard title="Your profile" style={styles.cardSpacing}>
          <View style={styles.hero}>
            <ProfileAvatar avatarUrl={profile?.avatar_url ?? null} label={avatarLabel} />
            <View style={styles.heroText}>
              {displayName ? <Text style={styles.heroTitle}>{displayName}</Text> : null}
              {username ? <Text style={styles.heroUsername}>@{username}</Text> : null}
            </View>
          </View>

          {profileDetailRows.map((row, index) => (
            <ProfileDetailRow
              key={row.label}
              label={row.label}
              value={row.value}
              isLast={index === profileDetailRows.length - 1}
            />
          ))}
          {profileDetailRows.length === 0 ? <View style={styles.profileEndPad} /> : null}
        </ShellCard>
      ) : null}

      <ShellCard title="Auth account" description="Always available from Supabase Auth (fallback).">
        <ProfileDetailRow label="Email" value={user?.email ?? "—"} />
        <ProfileDetailRow label="User ID" value={user?.id ?? "—"} mono isLast />
      </ShellCard>

      <ShellCard
        title="Read-only"
        description="Profile editing, moments, and settings remain on web/PWA. Mobile does not read user_presence or use GPS in Phase 2H."
        style={styles.cardSpacing}
      />

      {signOutError ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{signOutError}</Text>
        </View>
      ) : null}

      <PrimaryButton label="Sign out" onPress={onSignOut} loading={signingOut} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginBottom: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  mutedSmall: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 4,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroUsername: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  profileEndPad: {
    height: 4,
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.dangerMuted,
    marginBottom: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
