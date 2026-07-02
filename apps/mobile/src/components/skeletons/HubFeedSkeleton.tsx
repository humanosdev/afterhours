import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonLine } from "../ui/Skeleton";
import { hubLayout, hubVenueCardWidth } from "../../theme/hubLayout";
import { hubSlotLayout, hubFeedPageMinHeight } from "../../theme/hubSlotLayout";
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

export function HubActiveFriendsBlockSkeleton() {
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

export function HubLivePlacesSkeleton() {
  const cardW = hubVenueCardWidth();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.railScroll}
      contentContainerStyle={styles.placesRail}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} style={{ width: cardW, aspectRatio: 5 / 6 }} borderRadius={layout.cardRadius} />
      ))}
    </ScrollView>
  );
}

export function HubLivePlacesBlockSkeleton() {
  return (
    <View>
      <View style={styles.sectionTitleRow}>
        <HubSectionTitleSkeleton width={84} />
        <SkeletonLine width={56} height={14} />
      </View>
      <HubLivePlacesSkeleton />
    </View>
  );
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
  minHeight,
}: {
  showActiveFriends?: boolean;
  minHeight?: number;
}) {
  const baseMin = hubFeedPageMinHeight(showActiveFriends);
  const extraH = minHeight ? Math.max(0, minHeight - baseMin) : 0;
  const cardStride = hubSlotLayout.shareCardMinHeight + 12;
  const extraCards = extraH > 0 ? Math.ceil(extraH / cardStride) : 0;
  const shareCards = Math.max(2, 2 + extraCards);

  return (
    <View style={[styles.feedPage, minHeight != null && minHeight > 0 ? { minHeight, flex: 1 } : null]}>
      <View style={styles.feedMomentsBlock}>
        <HubMomentsBlockSkeleton />
      </View>
      {showActiveFriends ? (
        <>
          <View style={styles.feedMajorDivider} />
          <HubActiveFriendsBlockSkeleton />
        </>
      ) : null}
      <View style={styles.feedMajorDivider} />
      <View style={styles.feedSharesBlock}>
        <HubSharesBlockSkeleton shareCards={shareCards} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedPage: {
    width: "100%",
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
  placesRail: {
    gap: hubLayout.placesRailGap,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: hubLayout.placesRailPaddingBottom,
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
