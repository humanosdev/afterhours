import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";
import { ProfileDetailRow } from "../../src/components/ProfileDetailRow";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { ScreenHeader } from "../../src/components/ScreenHeader";
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
    <Screen scroll edges={["top", "left", "right"]} tabBarInset>
      <ScreenHeader title="Profile" />

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {!loading && profileError ? (
        <Text style={styles.hint}>Couldn’t load profile — showing account below.</Text>
      ) : null}

      <ShellCard style={styles.heroCard}>
        <View style={styles.hero}>
          <ProfileAvatar avatarUrl={profile?.avatar_url ?? null} label={avatarLabel} size={80} />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{displayName ?? "Your account"}</Text>
            {username ? <Text style={styles.heroUsername}>@{username}</Text> : null}
            {bio ? <Text style={styles.bio}>{bio}</Text> : null}
            {!hasProfileRow && !loading ? (
              <Text style={styles.bio}>Complete your profile on web/PWA.</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Moments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Places</Text>
          </View>
        </View>
      </ShellCard>

      <ShellCard>
        <ProfileDetailRow label="Email" value={user?.email ?? "—"} />
        {username ? <ProfileDetailRow label="Username" value={`@${username}`} /> : null}
        <ProfileDetailRow label="User ID" value={user?.id ?? "—"} mono isLast />
      </ShellCard>

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
  loadingRow: {
    paddingVertical: 24,
    alignItems: "center",
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 10,
  },
  heroCard: {
    marginBottom: 10,
  },
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },
  heroText: {
    flex: 1,
    gap: 4,
    paddingTop: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroUsername: {
    fontSize: 14,
    color: colors.accentActive,
    fontWeight: "500",
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 4,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
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
