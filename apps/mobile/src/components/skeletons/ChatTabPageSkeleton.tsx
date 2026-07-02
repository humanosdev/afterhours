import { StyleSheet, View } from "react-native";
import { Skeleton, SkeletonLine } from "../ui/Skeleton";
import { ChatListSkeleton, chatListSkeletonRowsForMinHeight } from "./ChatListSkeleton";
import { chrome } from "../../theme/chrome";
import { layout } from "../../theme/layout";
import {
  chatTabChromeAboveListPx,
  skeletonBandPageStyle,
  tabScreenHeaderChromeHeight,
} from "../../theme/skeletonLayout";

type ChatTabPageSkeletonProps = {
  minHeight: number;
};

/** Full Messages tab — header, search, tabs, inbox rows. */
export function ChatTabPageSkeleton({ minHeight }: ChatTabPageSkeletonProps) {
  const listMin = Math.max(120, minHeight - chatTabChromeAboveListPx());
  const rows = chatListSkeletonRowsForMinHeight(listMin, 6);

  return (
    <View style={[styles.page, skeletonBandPageStyle(minHeight)]}>
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <SkeletonLine width={128} height={20} />
          <SkeletonLine width={32} height={14} />
        </View>
      </View>
      <Skeleton style={styles.search} borderRadius={layout.inputRadius} />
      <View style={styles.tabRow}>
        <Skeleton style={styles.tabPill} borderRadius={999} />
        <Skeleton style={styles.tabPillWide} borderRadius={999} />
      </View>
      <View style={styles.listWrap}>
        <ChatListSkeleton rows={rows} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
  },
  headerWrap: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.pageHeaderBorder,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: tabScreenHeaderChromeHeight() - 24,
    gap: 12,
  },
  search: {
    height: 44,
    width: "100%",
    marginBottom: layout.sectionGap,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  tabPill: {
    width: 72,
    height: 36,
  },
  tabPillWide: {
    width: 96,
    height: 36,
  },
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
});
