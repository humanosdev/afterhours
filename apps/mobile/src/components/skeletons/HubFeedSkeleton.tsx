import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonLine } from "../ui/Skeleton";
import { hubLayout } from "../../theme/hubLayout";
import { hubSlotLayout, hubFeedPageMinHeight, type HubActiveFriendsSkeletonVariant } from "../../theme/hubSlotLayout";
import { layout } from "../../theme/layout";
import { mediaLayout, shareFeedDisplayFrameStyle } from "../../theme/mediaLayout";

const STORY_W = 78;
const STORY_CAPTION_GAP = 8;
const SECTION_TITLE_H = 18;

function HubSectionTitleSkeleton({ width = 88 }: { width?: number }) {
  return (
    <SkeletonLine
      width={width}
      height={SECTION_TITLE_H}
      style={styles.sectionTitle}
    />
  );
}

export function HubMomentsRailSkeleton() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.railScroll}
      contentContainerStyle={styles.rail}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.storyCol}>
          <SkeletonCircle size={STORY_W} />
          <SkeletonLine width={56} height={10} style={styles.storyLabel} />
        </View>
      ))}
    </ScrollView>
  );
}

export function HubMomentsBlockSkeleton() {
  return (
    <View>
      <HubSectionTitleSkeleton width={72} />
      <HubMomentsRailSkeleton />
    </View>
  );
}

export function HubActiveFriendsSkeleton() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.railScroll}
      contentContainerStyle={styles.friendsRail}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.friendCol}>
          <SkeletonCircle size={52} />
          <SkeletonLine width={56} height={10} />
          <SkeletonLine width={48} height={9} style={styles.friendSub} />
        </View>
      ))}
    </ScrollView>
  );
}

export function HubActiveFriendsEmptyBlockSkeleton() {
  return (
    <View style={{ minHeight: hubSlotLayout.activeFriendsBlockEmptyMinHeight }}>
      <View style={styles.sectionTitleRow}>
        <HubSectionTitleSkeleton width={96} />
        <SkeletonLine width={72} height={14} />
      </View>
      <View style={styles.activeFriendsEmptyBody}>
        <SkeletonLine width="88%" height={13} />
        <SkeletonLine width="72%" height={13} style={styles.activeFriendsEmptyLine} />
      </View>
    </View>
  );
}

export function HubActiveFriendsBlockSkeleton({
  variant = "empty",
}: {
  variant?: "rail" | "empty";
}) {
  if (variant === "rail") {
    return (
      <View style={{ minHeight: hubSlotLayout.activeFriendsBlockWithRailMinHeight }}>
        <View style={styles.sectionTitleRow}>
          <HubSectionTitleSkeleton width={96} />
          <SkeletonLine width={72} height={14} />
        </View>
        <HubActiveFriendsSkeleton />
      </View>
    );
  }
  return <HubActiveFriendsEmptyBlockSkeleton />;
}

export function HubShareCardSkeleton() {
  const mediaFrame = shareFeedDisplayFrameStyle(Dimensions.get("window").width, "portrait");
  return (
    <View style={styles.share}>
      <View style={styles.shareHeader}>
        <SkeletonCircle size={36} />
        <View style={styles.shareHeaderText}>
          <SkeletonLine width={120} height={14} />
        </View>
      </View>
      <View style={styles.shareMediaBleed}>
        <View style={[mediaFrame, styles.shareMediaStatic]} />
      </View>
      <View style={styles.shareActions}>
        <SkeletonLine width={80} height={14} />
        <SkeletonLine width={60} height={14} />
      </View>
    </View>
  );
}

export function HubSharesBlockSkeleton({ shareCards = 2 }: { shareCards?: number }) {
  return (
    <View>
      <HubSectionTitleSkeleton width={64} />
      <View style={styles.sharesFeed}>
        {Array.from({ length: shareCards }).map((_, i) => (
          <HubShareCardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

/** Full hub feed below search — matches section stack for fitted cold-open shell. */
export function HubFeedPageSkeleton({
  showActiveFriends = true,
  activeFriendsVariant = "empty",
  minHeight,
}: {
  showActiveFriends?: boolean;
  activeFriendsVariant?: HubActiveFriendsSkeletonVariant;
  minHeight?: number;
}) {
  const baseMin = hubFeedPageMinHeight(showActiveFriends, activeFriendsVariant);
  const extraH = minHeight ? Math.max(0, minHeight - baseMin) : 0;
  const cardStride = hubSlotLayout.shareCardMinHeight + 12;
  const extraCards = extraH > 0 ? Math.ceil(extraH / cardStride) : 0;
  const shareCards = Math.max(2, 2 + extraCards);

  return (
    <View style={[styles.feedPage, minHeight != null && minHeight > 0 ? { minHeight, flex: 1 } : styles.feedPageFill]}>
      <View style={styles.feedMomentsBlock}>
        <HubMomentsBlockSkeleton />
      </View>
      {showActiveFriends ? (
        <>
          <View style={styles.feedMajorDivider} />
          <HubActiveFriendsBlockSkeleton variant={activeFriendsVariant} />
        </>
      ) : null}
      <View style={styles.feedMajorDivider} />
      <View style={styles.feedSharesBlock}>
        <HubSharesBlockSkeleton shareCards={shareCards} />
      </View>
    </View>
  );
}

/** Full hub feed below search — cold-open boot shell (stable empty active-friends geometry). */
export function HubTabBootSkeleton({ minHeight }: { minHeight: number }) {
  return (
    <HubFeedPageSkeleton showActiveFriends activeFriendsVariant="empty" minHeight={minHeight} />
  );
}

const styles = StyleSheet.create({
  feedPage: {
    width: "100%",
  },
  feedPageFill: {
    flex: 1,
  },
  feedMomentsBlock: {
    marginBottom: hubLayout.momentsBlockBottom,
  },
  feedMajorDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginTop: hubLayout.majorDividerMarginTop,
    marginBottom: hubLayout.majorDividerMarginBottom,
  },
  feedSharesBlock: {
    marginTop: hubLayout.sharesSectionTop,
  },
  sharesFeed: {
    marginTop: hubLayout.sharesFeedTop,
  },
  sectionTitle: {
    marginBottom: hubLayout.sectionHeaderMarginBottom,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hubLayout.sectionHeaderMarginBottom,
    paddingHorizontal: 2,
  },
  railScroll: {
    marginHorizontal: -layout.screenPaddingX,
  },
  rail: {
    gap: layout.hubRailGap,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: hubLayout.railPaddingY,
    paddingBottom: hubLayout.railPaddingBottom,
    alignItems: "flex-start",
  },
  storyCol: {
    width: STORY_W,
    alignItems: "center",
    gap: 8,
  },
  storyLabel: {
    marginTop: STORY_CAPTION_GAP,
  },
  friendsRail: {
    gap: 16,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: hubLayout.railPaddingY,
    paddingBottom: 4,
  },
  friendCol: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  friendSub: {
    marginTop: 2,
  },
  activeFriendsEmptyBody: {
    paddingVertical: hubLayout.activeFriendsEmptyPy,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  activeFriendsEmptyLine: {
    marginTop: 0,
  },
  share: {
    gap: 12,
    marginBottom: mediaLayout.hubShareArticle.paddingBottom,
  },
  shareHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  shareHeaderText: {
    flex: 1,
    gap: 4,
  },
  shareMediaBleed: {
    marginHorizontal: -layout.screenPaddingX,
  },
  shareMediaStatic: {
    backgroundColor: mediaLayout.placeholderColor,
  },
  shareActions: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 2,
  },
});
