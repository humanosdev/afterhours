import { memo, useState } from "react";
import { useSharePressGestures } from "../../lib/useSharePressGestures";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react-native";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { MediaSlot } from "../media/MediaSlot";
import { normalizeShareAspect } from "../../lib/shareAspect";
import { layout } from "../../theme/layout";
import { mediaLayout, shareFeedDisplayFrameStyle } from "../../theme/mediaLayout";
import type { HubShareFeedItem } from "../../types/hubFeed";
import type { HubShareFeedCardState } from "../../lib/storyFeedInteractions";
import { formatSocialAgo } from "../../lib/socialTime";
import { mediaLexicon } from "../../content/mediaLexicon";
import { colors } from "../../theme/colors";
import { ProfileAvatar } from "../ProfileAvatar";
import { AnchorActionMenu } from "../ui/AnchorActionMenu";
import { GlassBottomSheet } from "../ui/GlassBottomSheet";
import { ReportContentSheet } from "../moderation/ReportContentSheet";
import { ReportedContentCover } from "../moderation/ReportedContentCover";
import { useReportedContent } from "../../providers/ReportedContentProvider";
import { ShareLikeBurst } from "./ShareLikeBurst";

type HubShareFeedCardProps = {
  item: HubShareFeedItem;
  meId: string | null;
  stats: HubShareFeedCardState;
  isLast?: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenStory?: () => void;
  onOpenProfile: () => void;
  /** Hub feed: tap opens story detail; profile grid keeps single-tap open. */
  openStoryOnTap?: boolean;
  onDoubleTapLike?: () => void;
  onToggleHideFromGrid?: () => void;
  onDeleteShare?: () => void;
};

/** Hub story card — likes, comments, owner menu, previews. */
export const HubShareFeedCard = memo(function HubShareFeedCard({
  item,
  meId,
  stats,
  onToggleLike,
  onOpenComments,
  onOpenStory,
  onOpenProfile,
  openStoryOnTap = true,
  onDoubleTapLike,
  onToggleHideFromGrid,
  onDeleteShare,
  isLast = false,
}: HubShareFeedCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const { isStoryReported } = useReportedContent();
  const reported = isStoryReported(item.id);
  const timeLabel = formatSocialAgo(item.created_at);
  const isOwnShare = !!meId && item.user_id === meId;
  const showOwnerMenu = isOwnShare && onToggleHideFromGrid && onDeleteShare;
  const mediaBleedX = layout.screenPaddingX;
  const mediaUri = item.image_url?.trim() ?? "";
  const shareFormat = normalizeShareAspect(item.share_aspect);
  const mediaFrame = shareFeedDisplayFrameStyle(Dimensions.get("window").width, shareFormat);

  if (__DEV__ && !mediaUri) {
    console.warn("[story-media] hub card missing image_url", item.id);
  }

  const handleDoubleTapLike = () => {
    if (reported) return;
    setLikeBurstKey((k) => k + 1);
    onDoubleTapLike?.();
  };

  const onMediaPress = useSharePressGestures({
    onSingleTap: !reported && openStoryOnTap && onOpenStory ? onOpenStory : undefined,
    onDoubleTap: !reported ? handleDoubleTapLike : undefined,
    enableSingleTap: openStoryOnTap && !reported,
  });

  const media = (
    <ReportedContentCover storyId={item.id} borderRadius={mediaLayout.feedMediaRadius}>
      <View style={[styles.mediaWrap, { marginHorizontal: -mediaBleedX }]}>
        <MediaSlot uri={mediaUri} frameStyle={mediaFrame} debugLabel={`hub-${item.id}`} />
        <ShareLikeBurst trigger={likeBurstKey} />
      </View>
    </ReportedContentCover>
  );

  return (
    <View
      style={[
        styles.article,
        { paddingBottom: isLast ? rhythm.lastPaddingBottom : rhythm.paddingBottom },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={onOpenProfile} style={styles.avatarHit} accessibilityRole="button">
          <ProfileAvatar avatarUrl={item.avatar_url} label={item.username} size={36} bordered={false} />
        </Pressable>
        <Pressable onPress={onOpenProfile} style={styles.headerText} accessibilityRole="button">
          <Text style={styles.username} numberOfLines={1}>
            {item.username}
          </Text>
        </Pressable>
        {showOwnerMenu || (!isOwnShare && meId && !reported) ? (
          <AnchorActionMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            accessibilityLabel={mediaLexicon.share.options}
            items={
              showOwnerMenu
                ? [
                    {
                      label: item.share_hidden
                        ? mediaLexicon.share.unhideFromGrid
                        : mediaLexicon.share.hideFromGrid,
                      onPress: () => onToggleHideFromGrid?.(),
                    },
                    {
                      label: mediaLexicon.share.delete,
                      destructive: true,
                      onPress: () => setConfirmDelete(true),
                    },
                  ]
                : [{ label: "Report", onPress: () => setReportOpen(true) }]
            }
          >
            <View style={styles.menuBtn}>
              <MoreHorizontal size={20} color={colors.textPrimary} strokeWidth={2} />
            </View>
          </AnchorActionMenu>
        ) : null}
      </View>

      {openStoryOnTap || onDoubleTapLike ? (
        <Pressable
          onPress={onMediaPress}
          accessibilityRole="button"
          accessibilityLabel={openStoryOnTap ? mediaLexicon.share.view : "Share photo"}
        >
          {media}
        </Pressable>
      ) : (
        media
      )}

      <View style={[styles.actions, reported && styles.actionsMuted]} pointerEvents={reported ? "none" : "auto"}>
        <Pressable
          onPress={onToggleLike}
          disabled={!meId}
          accessibilityRole="button"
          accessibilityLabel={stats.liked ? "Unlike" : "Like"}
          style={({ pressed }) => [styles.likeCluster, pressed && meId && styles.iconPressed]}
        >
          <Heart
            size={26}
            strokeWidth={1.65}
            color={stats.liked ? "#ef4444" : colors.textPrimary}
            fill={stats.liked ? "#ef4444" : "transparent"}
          />
          <Text style={styles.count}>{stats.likesCount}</Text>
        </Pressable>
        <Pressable
          onPress={onOpenComments}
          accessibilityRole="button"
          accessibilityLabel={stats.commentsCount ? `${stats.commentsCount} comments` : "Open comments"}
          style={({ pressed }) => [styles.commentCluster, pressed && styles.iconPressed]}
        >
          <MessageCircle size={26} strokeWidth={1.65} color={colors.textPrimary} />
          {stats.commentsCount > 0 ? <Text style={styles.commentCount}>{stats.commentsCount}</Text> : null}
        </Pressable>
      </View>

      {stats.likedByLine && !reported ? <Text style={styles.likedBy}>{stats.likedByLine}</Text> : null}

      {!reported && stats.commentPreviews.length > 0 ? (
        <View style={styles.previews}>
          {stats.commentPreviews.map((c) => (
            <Text key={c.id} style={styles.previewLine}>
              <Text style={styles.previewUser}>{c.username?.trim() || "user"}</Text>
              <Text style={styles.previewMuted}> </Text>
              <Text style={styles.previewBody}>{c.content}</Text>
            </Text>
          ))}
        </View>
      ) : null}

      {openStoryOnTap && onOpenStory ? (
        <Pressable onPress={onOpenStory} accessibilityRole="button">
          <Text style={styles.timestamp}>{timeLabel}</Text>
        </Pressable>
      ) : (
        <Text style={styles.timestamp}>{timeLabel}</Text>
      )}

      <ReportContentSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="story"
        targetId={item.id}
        contentLabel={mediaLexicon.share.label}
        targetUserId={item.user_id}
        targetUsername={item.username}
      />

      <GlassBottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`${mediaLexicon.share.delete}?`}
        heightFraction={0.34}
      >
        <View style={styles.confirmBody}>
          <Text style={styles.confirmCopy}>This can&apos;t be undone.</Text>
          <Pressable
            style={styles.confirmDeleteBtn}
            onPress={() => {
              setConfirmDelete(false);
              onDeleteShare?.();
            }}
          >
            <Text style={styles.confirmDeleteLabel}>{mediaLexicon.share.delete}</Text>
          </Pressable>
          <Pressable style={styles.confirmCancelBtn} onPress={() => setConfirmDelete(false)}>
            <Text style={styles.confirmCancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </GlassBottomSheet>
    </View>
  );
});

const rhythm = mediaLayout.hubShareArticle;

const styles = StyleSheet.create({
  article: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rhythm.headerGap,
    paddingHorizontal: 2,
    paddingBottom: rhythm.headerPaddingBottom,
    paddingTop: 2,
    zIndex: 10,
  },
  avatarHit: {
    borderRadius: 999,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
    color: colors.textPrimary,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaWrap: {
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    alignSelf: "stretch",
    borderRadius: mediaLayout.feedMediaRadius,
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
    minHeight: 1,
  },
  actions: {
    marginTop: rhythm.actionsMarginTop,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  actionsMuted: {
    opacity: 0.35,
  },
  likeCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 2,
    paddingRight: 4,
  },
  commentCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 2,
    paddingLeft: 4,
  },
  iconPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  count: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    fontVariant: ["tabular-nums"],
  },
  commentCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  likedBy: {
    marginTop: rhythm.likedByMarginTop,
    paddingHorizontal: 2,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite55,
  },
  previews: {
    marginTop: rhythm.previewsMarginTop,
    gap: rhythm.previewsGap,
    paddingHorizontal: 2,
  },
  previewLine: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255, 255, 255, 0.8)",
  },
  previewUser: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  previewMuted: {
    color: colors.textWhite45,
  },
  previewBody: {
    fontWeight: "400",
  },
  timestamp: {
    marginTop: rhythm.timestampMarginTop,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textWhite45,
    paddingHorizontal: 2,
  },
  confirmBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  confirmCopy: {
    fontSize: 14,
    color: colors.textWhite55,
    textAlign: "center",
  },
  confirmDeleteBtn: {
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmDeleteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fca5a5",
  },
  confirmCancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmCancelLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textWhite78,
  },
});
