import { StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "./ProfileAvatar";
import { colors } from "../theme/colors";

type ChatThreadRowProps = {
  name: string;
  preview: string;
  time: string;
  unread?: boolean;
  isLast?: boolean;
  avatarUrl?: string | null;
};

const AVATAR_SIZE = 52;

export function ChatThreadRow({
  name,
  preview,
  time,
  unread = false,
  isLast = false,
  avatarUrl,
}: ChatThreadRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  preview: {
    fontSize: 14,
    color: colors.textWhite42,
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
    color: colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentActive,
  },
  unreadSpacer: {
    width: 8,
    height: 8,
  },
});
