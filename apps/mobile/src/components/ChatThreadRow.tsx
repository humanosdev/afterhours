import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "./ProfileAvatar";
import { colors } from "../theme/colors";
import { chrome } from "../theme/chrome";

type ChatThreadRowProps = {
  name: string;
  preview: string;
  time: string;
  unread?: boolean;
  isLast?: boolean;
  avatarUrl?: string | null;
  onPress?: () => void;
};

const AVATAR_SIZE = 56;

export function ChatThreadRow({
  name,
  preview,
  time,
  unread = false,
  isLast = false,
  avatarUrl,
  onPress,
}: ChatThreadRowProps) {
  const body = (
    <>
      <ProfileAvatar avatarUrl={avatarUrl ?? null} label={name} size={AVATAR_SIZE} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.time}>{time}</Text>
        {unread ? <View style={styles.unreadDot} /> : <View style={styles.unreadSpacer} />}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint="Opens conversation"
        style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[styles.row, !isLast && styles.rowBorder]}>{body}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: chrome.listDivider,
  },
  pressed: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  preview: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textWhite55,
  },
  previewUnread: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  meta: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 44,
  },
  time: {
    fontSize: 12,
    color: colors.textWhite45,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#38bdf8",
  },
  unreadSpacer: {
    width: 10,
    height: 10,
  },
});
