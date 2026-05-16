import { StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "./ProfileAvatar";
import { colors } from "../theme/colors";

type FriendHubRingProps = {
  avatarUrl: string | null;
  /** Used for initials fallback and accessibility. */
  label: string;
};

/**
 * Hub moments-rail cell for a read-only friend — sized closer to web StoryRing lane (~84px).
 */
export function FriendHubRing({ avatarUrl, label }: FriendHubRingProps) {
  return (
    <View style={styles.wrap} accessibilityLabel={label}>
      <ProfileAvatar avatarUrl={avatarUrl} label={label} size={70} />
      <Text style={styles.caption} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 84,
    alignItems: "center",
    gap: 8,
  },
  caption: {
    width: "100%",
    fontSize: 12,
    lineHeight: 15,
    color: colors.textWhite55,
    textAlign: "center",
  },
});
