import { StyleSheet, View } from "react-native";
import { SkeletonCircle, SkeletonLine } from "../ui/Skeleton";

const ROW_AVATAR = 56;
const ROW_PADDING_Y = 14;
const ROW_BODY_GAP = 3;
const ROW_META_MIN_W = 44;

const CHAT_LIST_ROW_HEIGHT = ROW_PADDING_Y * 2 + ROW_AVATAR;
const CHAT_LIST_WRAP_PADDING = 8;

export function chatListSkeletonMinHeight(rows = 6): number {
  return CHAT_LIST_WRAP_PADDING + rows * CHAT_LIST_ROW_HEIGHT;
}

/** Enough inbox rows to fill a fitted tab body slot. */
export function chatListSkeletonRowsForMinHeight(minHeight: number, minRows = 6): number {
  const rows = Math.ceil((minHeight - CHAT_LIST_WRAP_PADDING) / CHAT_LIST_ROW_HEIGHT);
  return Math.max(minRows, rows);
}

export function ChatListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, i < rows - 1 && styles.rowBorder]}>
          <SkeletonCircle size={ROW_AVATAR} />
          <View style={styles.body}>
            <SkeletonLine width="55%" height={14} />
            <SkeletonLine width="78%" height={13} style={styles.previewLine} />
          </View>
          <View style={styles.meta}>
            <SkeletonLine width={36} height={12} />
            <View style={styles.unreadSpacer} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 4,
  },
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
    borderBottomColor: "rgba(255, 255, 255, 0.065)",
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: ROW_BODY_GAP,
  },
  previewLine: {
    marginTop: 0,
  },
  meta: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: ROW_META_MIN_W,
  },
  unreadSpacer: {
    width: 10,
    height: 10,
  },
});
