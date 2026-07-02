import { StyleSheet, View } from "react-native";
import { Skeleton, SkeletonLine } from "../ui/Skeleton";
import { HubFeedPageSkeleton } from "./HubFeedSkeleton";
import { chrome } from "../../theme/chrome";
import { hubLayout } from "../../theme/hubLayout";
import { layout } from "../../theme/layout";
import {
  hubTabChromeAboveFeedPx,
  skeletonBandPageStyle,
  tabScreenHeaderChromeHeight,
} from "../../theme/skeletonLayout";

type HubTabPageSkeletonProps = {
  minHeight: number;
  showActiveFriends?: boolean;
};

/** Full Hub tab — top chrome, search, feed blocks. */
export function HubTabPageSkeleton({ minHeight, showActiveFriends = true }: HubTabPageSkeletonProps) {
  const feedMin = Math.max(320, minHeight - hubTabChromeAboveFeedPx());

  return (
    <View style={[styles.page, skeletonBandPageStyle(minHeight)]}>
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <SkeletonLine width={48} height={20} />
          <Skeleton style={styles.logo} borderRadius={999} />
          <Skeleton style={styles.heart} borderRadius={999} />
        </View>
      </View>
      <Skeleton style={styles.search} borderRadius={layout.inputRadius} />
      <View style={styles.feedWrap}>
        <HubFeedPageSkeleton showActiveFriends={showActiveFriends} minHeight={feedMin} />
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
  logo: {
    width: 36,
    height: 36,
  },
  heart: {
    width: 44,
    height: 44,
  },
  search: {
    height: layout.searchBarHeight,
    width: "100%",
    marginBottom: hubLayout.searchBottomGap,
  },
  feedWrap: {
    flex: 1,
    minHeight: 0,
  },
});
