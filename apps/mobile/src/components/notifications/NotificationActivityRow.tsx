import { Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { isGroupedStoryEngagementFeedRow } from "@intencity/shared";
import { notificationActivityMessage } from "../../lib/notificationActivityCopy";
import { ProfileAvatar } from "../ProfileAvatar";
import { formatRelativeTime } from "../../lib/time";
import type { NotificationWithMeta } from "../../types/notification";
import { colors } from "../../theme/colors";
import { chrome } from "../../theme/chrome";

type NotificationActivityRowProps = {
  item: NotificationWithMeta;
  isLast: boolean;
  onPress: () => void;
  onDelete: () => void;
  onAvatarPress?: () => void;
};

function GroupedAvatarStack({
  urls,
  totalCount,
}: {
  urls: (string | null)[];
  totalCount: number;
}) {
  const shown = urls.slice(0, 3);
  const extra = Math.max(0, totalCount - shown.length);
  return (
    <View style={styles.stackRow}>
      {shown.map((url, i) => (
        <View key={`${i}-${url ?? "x"}`} style={[styles.stackItem, { marginLeft: i === 0 ? 0 : -8 }]}>
          <ProfileAvatar avatarUrl={url} label="?" size={32} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.stackExtra, { marginLeft: -8 }]}>
          <Text style={styles.stackExtraText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function NotificationActivityRow({
  item,
  isLast,
  onPress,
  onDelete,
  onAvatarPress,
}: NotificationActivityRowProps) {
  const isGrouped = isGroupedStoryEngagementFeedRow(item);
  const actorName =
    item.actor_label || item.actor_display_name || item.actor_username || "Someone";
  const message = notificationActivityMessage(item);

  return (
    <View style={[styles.row, !item.read && styles.rowUnread, isLast && styles.rowLast]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        {isGrouped && item.group_preview_avatars ? (
          <GroupedAvatarStack
            urls={item.group_preview_avatars}
            totalCount={item.group_actor_count ?? item.group_preview_avatars.length}
          />
        ) : (
          <Pressable onPress={onAvatarPress} disabled={!onAvatarPress}>
            <ProfileAvatar avatarUrl={item.actor_avatar_url ?? null} label={actorName} size={36} />
          </Pressable>
        )}
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {actorName}
          </Text>
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(item.created_at, { nowLabel: "now" })}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete notification"
        style={styles.deleteBtn}
      >
        <Trash2 size={18} color="rgba(255,255,255,0.35)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.listDivider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowUnread: {
    backgroundColor: "rgba(59, 102, 255, 0.06)",
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pressed: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textWhite85,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite65,
  },
  time: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textWhite42,
  },
  deleteBtn: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  stackRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 56,
  },
  stackItem: {
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    borderRadius: 20,
  },
  stackExtra: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stackExtraText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textWhite85,
  },
});
