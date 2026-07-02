import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SkeletonCircle, SkeletonLine } from "../ui/Skeleton";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";

/** PWA `ChatConversationSkeleton.tsx` — thread header + bubbles + composer. */
export function ChatConversationSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
        <SkeletonLine width={40} height={40} style={styles.backSk} />
        <SkeletonCircle size={40} />
        <View style={styles.headerText}>
          <SkeletonLine width="46%" height={15} />
          <SkeletonLine width="28%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>

      <View style={styles.bubbles}>
        <View style={styles.rowStart}>
          <SkeletonLine width="72%" height={40} style={styles.bubblePeer} />
        </View>
        <View style={styles.rowEnd}>
          <SkeletonLine width="58%" height={36} style={styles.bubbleOwn} />
        </View>
        <View style={styles.rowStart}>
          <SkeletonLine width="64%" height={44} style={styles.bubblePeer} />
        </View>
        <View style={styles.rowEnd}>
          <SkeletonLine width="52%" height={32} style={styles.bubbleOwn} />
        </View>
        <View style={styles.rowStart}>
          <SkeletonLine width="78%" height={36} style={styles.bubblePeer} />
        </View>
      </View>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
        <SkeletonLine width="100%" height={44} style={styles.composerField} />
        <SkeletonLine width={72} height={44} style={styles.composerSend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    maxWidth: layout.contentMaxWidth + layout.screenPaddingX * 2,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backSk: {
    borderRadius: 20,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  bubbles: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  rowStart: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  rowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  bubblePeer: {
    borderRadius: 16,
    borderBottomLeftRadius: 6,
  },
  bubbleOwn: {
    borderRadius: 16,
    borderBottomRightRadius: 6,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: "rgba(10, 12, 24, 0.92)",
  },
  composerField: {
    flex: 1,
    borderRadius: 16,
  },
  composerSend: {
    borderRadius: 16,
  },
});
