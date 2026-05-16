import { StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "./ProfileAvatar";
import { colors } from "../theme/colors";

type FriendHubRingProps = {
  avatarUrl: string | null;
  /** Used for initials fallback and accessibility. */
  label: string;
};

/**
 * Hub moments-rail cell for a read-only friend (Phase 2K). Stories not wired — avatar + name only.
 */
export function FriendHubRing({ avatarUrl, label }: FriendHubRingProps) {
  return (
    <View style={styles.wrap} accessibilityLabel={label}>
      <View style={styles.ring}>
        <ProfileAvatar avatarUrl={avatarUrl} label={label} size={56} />
      </View>
      <Text style={styles.caption} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    width: "100%",
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
});
