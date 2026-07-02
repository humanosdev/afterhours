import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Surface } from "../Surface";
import { StoryRing } from "../StoryRing";
import type { StoryRingVisualState } from "../../theme/paritySemantics";
import { colors } from "../../theme/colors";
import { profileLayout } from "../../theme/profileLayout";

type ProfileIdentityBlockProps = {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  avatarLabel: string;
  bio: string | null;
  friendCount: number;
  friendsLoading: boolean;
  venuesCount: number;
  sharesCount: number;
  venueLabel?: string;
  /** Subtle live accent when checked in at a venue. */
  venueLive?: boolean;
  /** Stack / public profile — less air above avatar row (matches tab profile). */
  compactTop?: boolean;
  ringState?: StoryRingVisualState;
  onAvatarPress?: () => void;
  /** When omitted, Friends stat is not tappable (private / blocked profiles). */
  onFriendsPress?: () => void;
  /** Own profile — opens Venues tab + first-time coach. */
  onVenuesPress?: () => void;
};

/** PWA profile grid: `grid-cols-[5.25rem_1fr]`, stats, venue pill, name under avatar, bio row. */
export function ProfileIdentityBlock({
  displayName,
  username,
  avatarUrl,
  avatarLabel,
  bio,
  friendCount,
  friendsLoading,
  venuesCount,
  sharesCount,
  venueLabel = "Not at a venue",
  venueLive = false,
  compactTop = false,
  ringState = "none",
  onAvatarPress,
  onFriendsPress,
  onVenuesPress,
}: ProfileIdentityBlockProps) {
  const router = useRouter();
  const nameUnderAvatar = displayName.trim() || username || "You";

  return (
    <View style={[styles.block, compactTop && styles.blockCompactTop]}>
      <View style={styles.gridRow}>
        <Pressable
          onPress={onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Open active Moment or Moments tab"
          style={styles.avatarCell}
        >
          <StoryRing
            label={nameUnderAvatar}
            avatarUrl={avatarUrl}
            ringState={ringState}
            showCaption={false}
            size="xl"
          />
        </Pressable>

        <View style={styles.statsColumn}>
          <View style={styles.statsGrid}>
            <Pressable
              style={styles.statCell}
              onPress={onFriendsPress}
              disabled={!onFriendsPress}
              accessibilityRole="button"
              accessibilityState={{ disabled: !onFriendsPress }}
            >
              <Text style={styles.statValue}>{friendsLoading ? "…" : String(friendCount)}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </Pressable>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{sharesCount}</Text>
              <Text style={styles.statLabel}>Shares</Text>
            </View>
            <Pressable
              style={styles.statCell}
              onPress={onVenuesPress}
              disabled={!onVenuesPress}
              accessibilityRole="button"
              accessibilityState={{ disabled: !onVenuesPress }}
            >
              <Text style={styles.statValue}>{venuesCount}</Text>
              <Text style={styles.statLabel}>Venues</Text>
            </Pressable>
          </View>

          <Surface variant="venuePill" style={[styles.venuePill, venueLive && styles.venuePillLive]}>
            {venueLive ? <View style={styles.venueLiveDot} accessibilityElementsHidden /> : null}
            <Text style={[styles.venuePillText, venueLive && styles.venuePillTextLive]} numberOfLines={2}>
              {venueLabel}
            </Text>
          </Surface>
        </View>
      </View>

      <Text style={styles.nameUnderAvatar} numberOfLines={2}>
        {nameUnderAvatar}
      </Text>

      {bio?.trim() ? (
        <Text style={styles.bio}>{bio.trim()}</Text>
      ) : (
        <Text style={styles.bioEmpty}>No bio yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingTop: profileLayout.identityTop,
  },
  blockCompactTop: {
    paddingTop: 12,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: profileLayout.gridGapX,
  },
  avatarCell: {
    width: profileLayout.avatarColWidth,
  },
  statsColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    justifyContent: "center",
    gap: 12,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  statValue: {
    fontSize: profileLayout.statValueSize,
    fontWeight: "600",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    marginTop: 4,
    fontSize: profileLayout.statLabelSize,
    color: colors.textWhite45,
    fontWeight: "500",
  },
  venuePill: {
    width: "100%",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    flexDirection: "row",
    gap: 6,
  },
  venuePillLive: {
    borderColor: "rgba(52, 211, 153, 0.28)",
    backgroundColor: "rgba(52, 211, 153, 0.06)",
  },
  venueLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#34d399",
    flexShrink: 0,
  },
  venuePillText: {
    fontSize: profileLayout.venuePillText,
    fontWeight: "500",
    lineHeight: 16,
    color: colors.textWhite75,
    textAlign: "center",
    flexShrink: 1,
  },
  venuePillTextLive: {
    color: colors.textWhite85,
    fontWeight: "600",
  },
  nameUnderAvatar: {
    marginTop: profileLayout.nameUnderAvatarTop,
    width: profileLayout.avatarColWidth,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    letterSpacing: -0.2,
    color: colors.textPrimary,
    textAlign: "left",
  },
  bio: {
    marginTop: profileLayout.bioTop,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textWhite75,
  },
  bioEmpty: {
    marginTop: profileLayout.bioTop,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.38)",
  },
});
