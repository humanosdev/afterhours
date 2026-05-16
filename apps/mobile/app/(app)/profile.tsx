import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";
import { ProfileDetailRow } from "../../src/components/ProfileDetailRow";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { GlassSurface } from "../../src/components/GlassSurface";
import { useAcceptedFriends } from "../../src/hooks/useAcceptedFriends";
import { useMyProfile } from "../../src/hooks/useMyProfile";
import { profileAvatarLabel, profileDisplayName } from "../../src/lib/profileDisplay";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

const TABS = ["Shares", "Archive", "Places"] as const;

export default function ProfileTabScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading, error: profileError } = useMyProfile(user?.id);
  const { friends, loading: friendsLoading } = useAcceptedFriends(user?.id);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Shares");

  const displayName = profileDisplayName(profile);
  const avatarLabel = profileAvatarLabel(profile, user?.email);
  const hasProfileRow = Boolean(profile);
  const username = profile?.username?.trim() ?? null;
  const bio = profile?.bio?.trim() ?? null;
  const handleLine = username ? `@${username}` : user?.email?.split("@")[0] ?? "Account";

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
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Profile</Text>
        <View style={styles.menuGhost} accessibilityLabel="More options">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textWhite78} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {!loading && profileError ? (
        <Text style={styles.hint}>Couldn’t load profile — showing account below.</Text>
      ) : null}

      <View style={styles.heroAlign}>
        <ProfileAvatar avatarUrl={profile?.avatar_url ?? null} label={avatarLabel} size={88} />
        <Text style={styles.handle}>{handleLine}</Text>
        <Text style={styles.displayName}>{displayName ?? "Your account"}</Text>
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
        {!hasProfileRow && !loading ? (
          <Text style={styles.bioMuted}>Complete your profile on web/PWA.</Text>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionPill, styles.actionPillMuted]}
          disabled
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Edit profile — use web/PWA"
        >
          <Text style={styles.actionPillLabelMuted}>Edit profile</Text>
        </Pressable>
        <Pressable
          style={styles.actionPill}
          disabled
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Share profile — use web/PWA"
        >
          <Ionicons name="share-outline" size={17} color={colors.textPrimary} />
          <Text style={styles.actionPillLabel}>Share profile</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const on = activeTab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[styles.tab, on && styles.tabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <GlassSurface style={styles.tabHint} muted>
        <Text style={styles.tabHintText}>
          {activeTab === "Shares"
            ? "Shares and grids stay on web/PWA — native profile is read-only."
            : activeTab === "Archive"
              ? "Archive browsing is available on web/PWA."
              : "Venue places lists open from web/PWA today."}
        </Text>
      </GlassSurface>

      <ShellCard style={styles.statsCard}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Moments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{friendsLoading ? "…" : String(friends.length)}</Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  menuGhost: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(10, 12, 24, 0.72)",
  },
  loadingRow: {
    paddingVertical: 24,
    alignItems: "center",
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 10,
  },
  heroAlign: {
    alignItems: "center",
    paddingBottom: 8,
    gap: 6,
  },
  handle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  displayName: {
    fontSize: 13,
    color: colors.textWhite55,
    maxWidth: 320,
    textAlign: "center",
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 340,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  bioMuted: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    textAlign: "center",
    maxWidth: 320,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 16,
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(10, 12, 24, 0.72)",
    minHeight: 44,
  },
  actionPillMuted: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: colors.borderSubtle,
  },
  actionPillLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionPillLabelMuted: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textWhite55,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: 8,
  },
  tab: {
    paddingBottom: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabOn: {
    borderBottomColor: colors.accentActive,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabLabelOn: {
    color: colors.textPrimary,
  },
  tabHint: {
    borderRadius: layout.cardRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: layout.sectionGap,
  },
  tabHintText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite42,
    textAlign: "center",
  },
  statsCard: {
    marginBottom: 10,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.divider,
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
