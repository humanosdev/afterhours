import { Pressable, StyleSheet, Text, View } from "react-native";
import { AvatarOnlineBadge } from "../AvatarOnlineBadge";
import { ProfileAvatar } from "../ProfileAvatar";
import { colors } from "../../theme/colors";

const AVATAR_SIZE = 52;
const ONLINE_BADGE_SIZE = 13;

type HubActiveFriendChipProps = {
  label: string;
  subtitle: string;
  avatarUrl: string | null;
  onPress?: () => void;
  /** Green corner badge — hub online friends rail. */
  showOnlineBadge?: boolean;
};

/** PWA hub active-friend column — avatar + name + activity subtitle. */
export function HubActiveFriendChip({
  label,
  subtitle,
  avatarUrl,
  onPress,
  showOnlineBadge = true,
}: HubActiveFriendChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${subtitle}`}
    >
      <View style={styles.avatarAnchor}>
        <ProfileAvatar avatarUrl={avatarUrl} label={label} size={AVATAR_SIZE} bordered={false} />
        {showOnlineBadge ? <AvatarOnlineBadge size={ONLINE_BADGE_SIZE} /> : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 72,
    alignItems: "center",
    gap: 4,
  },
  avatarAnchor: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  copy: {
    width: "100%",
    alignItems: "center",
    gap: 1,
  },
  name: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "600",
    color: colors.textWhite85,
    textAlign: "center",
  },
  sub: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.textWhite45,
    textAlign: "center",
  },
});
