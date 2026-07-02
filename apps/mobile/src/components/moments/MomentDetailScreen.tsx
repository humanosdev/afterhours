import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PostMediaFrame, postMediaFrameStyle } from "../media/PostMediaFrame";
import { useRouter } from "expo-router";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnchorActionMenu } from "../ui/AnchorActionMenu";
import { GlassBottomSheet } from "../ui/GlassBottomSheet";
import { IconHitTarget } from "../IconHitTarget";
import { ProfileAvatar } from "../ProfileAvatar";
import { SkeletonLine } from "../ui/Skeleton";
import { fetchAcceptedFriends } from "../../lib/fetchAcceptedFriends";
import {
  fetchMomentDetail,
  fetchMomentShareComments,
  type MomentComment,
  type MomentDetail,
} from "../../lib/fetchMomentDetail";
import { deleteHubShare, toggleHubShareHidden } from "../../lib/hubShareMutations";
import { performShareLike } from "../../lib/performShareLike";
import { useSharePressGestures } from "../../lib/useSharePressGestures";
import { ShareLikeBurst } from "../shares/ShareLikeBurst";
import { supabase } from "../../lib/supabase/client";
import { fetchLikedByFriendsLineForStory } from "../../lib/storyFeedInteractions";
import { getCachedShareStats } from "../../lib/shareStatsCache";
import { subscribeShareLikeUpdated } from "../../lib/shareLikeEvents";
import { formatSocialAgo } from "../../lib/socialTime";
import { BLOCK_OR_PRIVATE_COPY } from "../../content/blockCopy";
import { mediaLexicon } from "../../content/mediaLexicon";
import { profileUsernameLabel } from "../../lib/profileDisplay";
import { useAuth } from "../../providers/AuthProvider";
import { useCreateComposer } from "../../providers/CreateComposerProvider";
import { colors } from "../../theme/colors";
import { chrome } from "../../theme/chrome";
import { layout } from "../../theme/layout";
import { mediaLayout } from "../../theme/mediaLayout";
import { Dimensions } from "react-native";
import { getCachedStoryDisplayUri } from "../../lib/storyDisplayUriCache";
import {
  getMomentDetailSeed,
  momentDetailFromSeed,
} from "../../lib/momentDetailSeedCache";
import { ReportContentSheet } from "../moderation/ReportContentSheet";
import { ReportedContentCover } from "../moderation/ReportedContentCover";
import { useReportedContent } from "../../providers/ReportedContentProvider";
import { useFittedPageShell } from "../../hooks/useMinimumSkeleton";
import {
  momentDetailExitHref,
  type MomentDetailFrom,
} from "../../lib/momentDetailNavigation";

type MomentDetailScreenProps = {
  storyId: string;
  archiveView?: boolean;
  /** Screen to return to after owner hide/delete (profile grid, hub feed, etc.). */
  returnTo?: MomentDetailFrom;
};

/**
 * Story/moment detail for one `stories` row — hub stories vs archived moments.
 * Stories: likes, comments, owner hide/delete. Moments: media + delete only.
 * Do not use for Hub story-rail tap-through — that is StoryViewerModal (not built on native yet).
 */
export function MomentDetailScreen({
  storyId,
  archiveView = false,
  returnTo,
}: MomentDetailScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bumpStoryEpoch, openShareComments } = useCreateComposer();
  const { isStoryReported } = useReportedContent();

  const seed = useMemo(() => (storyId ? getMomentDetailSeed(storyId) : null), [storyId]);
  const [loading, setLoading] = useState(() => !seed);
  const [moment, setMoment] = useState<MomentDetail | null>(() =>
    seed ? momentDetailFromSeed(seed) : null
  );
  const [ownerUsername, setOwnerUsername] = useState<string | null>(() => seed?.owner_username ?? null);
  const [ownerAvatar, setOwnerAvatar] = useState<string | null>(() => seed?.owner_avatar_url ?? null);
  const [likesCount, setLikesCount] = useState(() => getCachedShareStats(storyId)?.likesCount ?? 0);
  const [liked, setLiked] = useState(() => getCachedShareStats(storyId)?.liked ?? false);
  const [likedByLine, setLikedByLine] = useState<string | null>(
    () => getCachedShareStats(storyId)?.likedByLine ?? null
  );
  const [comments, setComments] = useState<MomentComment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [mediaReady, setMediaReady] = useState(
    () => !!(seed?.image_url && getCachedStoryDisplayUri(seed.image_url))
  );
  const [likeBurstKey, setLikeBurstKey] = useState(0);

  const load = useCallback(async () => {
    const hadSeed = !!getMomentDetailSeed(storyId);
    if (!hadSeed) {
      setLoading(true);
      setLoadError(null);
    }
    const friendsRes = user?.id ? await fetchAcceptedFriends(user.id) : { friends: [], error: null };
    const ids = friendsRes.friends.map((f) => f.id);
    setFriendIds(ids);

    const result = await fetchMomentDetail(storyId, user?.id ?? null, ids, archiveView);
    setMoment(result.moment);
    setOwnerUsername(result.owner?.username ?? null);
    setOwnerAvatar(result.owner?.avatar_url ?? null);
    setLikesCount(result.likesCount);
    setLiked(result.liked);
    setLikedByLine(result.likedByLine);
    setComments(result.comments);
    setLoadError(result.error);
    setLoading(false);
  }, [storyId, user?.id, archiveView]);

  useEffect(() => {
    const cached = getCachedShareStats(storyId);
    if (cached) {
      setLikesCount(cached.likesCount);
      setLiked(cached.liked);
      setLikedByLine(cached.likedByLine);
    }
  }, [storyId]);

  useEffect(() => {
    return subscribeShareLikeUpdated((detail) => {
      if (detail.storyId !== storyId) return;
      const row = getCachedShareStats(storyId);
      if (!row) return;
      setLikesCount(row.likesCount);
      setLiked(row.liked);
      setLikedByLine(row.likedByLine);
    });
  }, [storyId]);

  useEffect(() => {
    setMediaReady(false);
    void load();
  }, [load]);

  useEffect(() => {
    setMediaReady(false);
  }, [moment?.id, moment?.image_url]);

  const isOwner = !!user?.id && moment?.user_id === user.id;
  const isShare = moment?.is_share ?? false;
  const reported = moment ? isStoryReported(moment.id) : false;
  const timeLabel = moment ? formatSocialAgo(moment.created_at) : "";

  const refreshCommentsQuietly = useCallback(async () => {
    const next = await fetchMomentShareComments(storyId);
    setComments(next);
  }, [storyId]);

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user?.id) return;
      const { error } = await supabase.from("story_comments").delete().eq("id", commentId);
      if (error) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [user?.id]
  );

  const canRemoveComment = useCallback(
    (commentUserId: string) => {
      if (!user?.id) return false;
      if (commentUserId === user.id) return true;
      return moment?.user_id === user.id;
    },
    [user?.id, moment?.user_id]
  );

  const handleOpenComments = useCallback(() => {
    openShareComments(storyId, {
      onCommentsChanged: (changedId, delta) => {
        if (changedId !== storyId || delta === 0) return;
        void refreshCommentsQuietly();
      },
    });
  }, [storyId, openShareComments, refreshCommentsQuietly]);
  const headerTitle = profileUsernameLabel({ username: ownerUsername }, "user");
  const showDetailSkeleton = useFittedPageShell(loading && !moment);
  const windowWidth = Dimensions.get("window").width;
  const mediaVariant = isShare ? "share" : "moment";
  const contentRevealed = !!moment && mediaReady;

  const exitAfterShareRemoved = useCallback(() => {
    bumpStoryEpoch();
    const href = momentDetailExitHref(returnTo);
    if (href) {
      router.replace(href);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/profile");
  }, [bumpStoryEpoch, returnTo, router]);

  const applyLikeUi = useCallback((nextLiked: boolean) => {
    setLiked((prevLiked) => {
      if (prevLiked !== nextLiked) {
        setLikesCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
      }
      return nextLiked;
    });
    if (!moment?.is_share) return;
    setLikedByLine((line) => {
      if (nextLiked) return line ?? "Liked by You";
      if (!line?.includes("You")) return line;
      const rest = line.replace(/^Liked by You,?\s*/, "").trim();
      return rest ? `Liked by ${rest}` : null;
    });
  }, [moment?.is_share]);

  const reconcileLikedByLine = useCallback(async () => {
    if (!moment || !user?.id || !isShare) return;
    const line = await fetchLikedByFriendsLineForStory(moment.id, user.id, friendIds);
    setLikedByLine(line);
  }, [moment, user?.id, isShare, friendIds]);

  const onToggleLike = useCallback(() => {
    if (!moment || !user?.id) return;
    void performShareLike({
      storyId: moment.id,
      meId: user.id,
      ownerUserId: moment.user_id,
      currentlyLiked: liked,
      onOptimistic: applyLikeUi,
      onReconcile: reconcileLikedByLine,
    });
  }, [moment, user?.id, liked, applyLikeUi, reconcileLikedByLine]);

  const onDoubleTapLike = useCallback(() => {
    if (!moment || !user?.id || !isShare || reported) return;
    setLikeBurstKey((k) => k + 1);
    if (liked) return;
    void performShareLike({
      storyId: moment.id,
      meId: user.id,
      ownerUserId: moment.user_id,
      currentlyLiked: false,
      onOptimistic: applyLikeUi,
      onReconcile: reconcileLikedByLine,
    });
  }, [moment, user?.id, isShare, reported, liked, applyLikeUi, reconcileLikedByLine]);

  const onMediaPress = useSharePressGestures({
    onDoubleTap: isShare && !reported ? onDoubleTapLike : undefined,
    enableSingleTap: false,
  });

  const onToggleHide = async () => {
    if (!moment || !user?.id || !isOwner || !isShare) return;
    setMenuOpen(false);
    const next = !moment.share_hidden;
    const { ok } = await toggleHubShareHidden(moment.id, user.id, next);
    if (!ok) return;
    setMoment((m) => (m ? { ...m, share_hidden: next } : m));
    if (next) exitAfterShareRemoved();
  };

  const onDelete = async () => {
    if (!moment || !user?.id || !isOwner) return;
    setConfirmDelete(false);
    const { ok } = await deleteHubShare(moment.id, user.id);
    if (!ok) return;
    exitAfterShareRemoved();
  };

  const openOwnerProfile = () => {
    if (!moment) return;
    if (isOwner) {
      router.push("/profile");
      return;
    }
    const slug = ownerUsername?.trim().replace(/^@/, "");
    if (slug) {
      router.push(`/u/${encodeURIComponent(slug)}`);
      return;
    }
    router.back();
  };

  if (showDetailSkeleton && !moment) {
    // `/moments/[id]` is almost always a hub/profile share — not 9:16 moment viewer.
    const loadFrame = postMediaFrameStyle("share", "portrait", windowWidth);
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconHitTarget onPress={() => router.back()} accessibilityLabel="Go back" size={40}>
            <Text style={styles.backChevron}>←</Text>
          </IconHitTarget>
          <View style={styles.headerCenter}>
            <View style={styles.staticLineWide} />
            <View style={styles.staticLineNarrow} />
          </View>
          <View style={styles.backWell} />
        </View>
        <View style={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.mediaBleed}>
            <View style={[loadFrame, styles.staticMediaBlock]} />
          </View>
          <View style={styles.actionsSkeleton}>
            <View style={styles.staticActionBlock} />
            <View style={styles.staticActionBlockSmall} />
          </View>
        </View>
      </View>
    );
  }

  if (!moment) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconHitTarget onPress={() => router.back()} accessibilityLabel="Go back" size={40}>
            <Text style={styles.backChevron}>←</Text>
          </IconHitTarget>
        </View>
        <View style={styles.unavailable}>
          <Text style={styles.unavailableTitle}>{BLOCK_OR_PRIVATE_COPY.postUnavailableTitle}</Text>
          <Text style={styles.unavailableBody}>{BLOCK_OR_PRIVATE_COPY.postUnavailableBody}</Text>
          {loadError ? <Text style={styles.err}>{loadError}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconHitTarget onPress={() => router.back()} accessibilityLabel="Go back" size={40}>
          <Text style={styles.backChevron}>←</Text>
        </IconHitTarget>
        <Pressable style={styles.headerCenter} onPress={openOwnerProfile} accessibilityRole="button">
          <Text style={styles.headerUser} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={styles.headerTime} numberOfLines={1}>
            {timeLabel}
          </Text>
        </Pressable>
        {moment && (isOwner || (user?.id && !reported)) ? (
          <AnchorActionMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            accessibilityLabel={isShare ? mediaLexicon.share.options : "Moment options"}
            items={
              isOwner
                ? [
                    ...(isShare
                      ? [
                          {
                            label: moment.share_hidden
                              ? mediaLexicon.share.unhideFromGrid
                              : mediaLexicon.share.hideFromGrid,
                            onPress: () => void onToggleHide(),
                          },
                        ]
                      : []),
                    {
                      label: isShare ? mediaLexicon.share.delete : mediaLexicon.moment.delete,
                      destructive: true,
                      onPress: () => setConfirmDelete(true),
                    },
                  ]
                : [{ label: "Report", onPress: () => setReportOpen(true) }]
            }
          >
            <View style={styles.menuTrigger}>
              <MoreHorizontal size={20} color={colors.textPrimary} strokeWidth={2} />
            </View>
          </AnchorActionMenu>
        ) : (
          <View style={styles.backWell} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isShare ? styles.mediaBleed : undefined}>
          {isShare && !reported ? (
            <Pressable onPress={onMediaPress} accessibilityRole="button" accessibilityLabel="Share photo">
              <ReportedContentCover storyId={moment.id} borderRadius={mediaLayout.feedMediaRadius}>
                <View style={styles.mediaBurstWrap}>
                  <PostMediaFrame
                    uri={moment.image_url}
                    variant={mediaVariant}
                    shareAspect={moment.share_aspect}
                    debugLabel={`detail-${moment.id}`}
                    onMediaReady={() => setMediaReady(true)}
                  />
                  <ShareLikeBurst trigger={likeBurstKey} />
                </View>
              </ReportedContentCover>
            </Pressable>
          ) : (
            <ReportedContentCover storyId={moment.id} borderRadius={mediaLayout.feedMediaRadius}>
              <PostMediaFrame
                uri={moment.image_url}
                variant={mediaVariant}
                shareAspect={moment.share_aspect}
                debugLabel={`detail-${moment.id}`}
                onMediaReady={() => setMediaReady(true)}
                style={isShare ? undefined : styles.momentFrameShadow}
              />
            </ReportedContentCover>
          )}
        </View>

        <View
          style={[styles.actions, { opacity: contentRevealed && !reported ? 1 : 0 }]}
          pointerEvents={contentRevealed && !reported ? "auto" : "none"}
        >
          <Pressable
            onPress={onToggleLike}
            disabled={!user?.id}
            style={styles.likeHit}
            accessibilityRole="button"
            accessibilityLabel={liked ? "Unlike" : "Like"}
          >
            <Heart
              size={26}
              strokeWidth={1.75}
              color={liked ? "#ef4444" : "rgba(255,255,255,0.9)"}
              fill={liked ? "#ef4444" : "transparent"}
            />
            <Text style={styles.count}>{likesCount}</Text>
          </Pressable>
          {!archiveView && isShare ? (
            <Pressable
              onPress={handleOpenComments}
              style={styles.commentHit}
              accessibilityRole="button"
              accessibilityLabel="Open comments"
            >
              <MessageCircle size={26} strokeWidth={1.75} color={colors.textPrimary} />
              {comments.length > 0 ? <Text style={styles.commentCount}>{comments.length}</Text> : null}
            </Pressable>
          ) : null}
        </View>

        {!archiveView && isShare && likedByLine && !reported ? (
          <Text style={[styles.likedBy, { opacity: contentRevealed ? 1 : 0 }]}>{likedByLine}</Text>
        ) : null}

        {!archiveView && isShare && !reported ? (
          <View style={[styles.commentPanel, { opacity: contentRevealed ? 1 : 0 }]} pointerEvents={contentRevealed ? "auto" : "none"}>
            {comments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <ProfileAvatar
                    avatarUrl={c.avatar_url}
                    label={c.username ?? "user"}
                    size={28}
                    bordered={false}
                  />
                  <View style={styles.commentTextCol}>
                    <Text style={styles.commentUser}>{c.username?.trim() || "user"}</Text>
                    <Text style={styles.commentBody}>{c.content}</Text>
                  </View>
                  {canRemoveComment(c.user_id) ? (
                    <Pressable onPress={() => void deleteComment(c.id)} hitSlop={8}>
                      <Text style={styles.commentRemove}>
                        {isOwner && c.user_id !== user?.id ? "Delete" : "Remove"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
            <Pressable onPress={handleOpenComments} style={styles.viewAllComments}>
              <Text style={styles.viewAllCommentsLabel}>
                {comments.length > 0 ? "View all in comments" : "Add a comment"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {moment ? (
        <ReportContentSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="story"
          targetId={moment.id}
          contentLabel={isShare ? mediaLexicon.share.label : mediaLexicon.moment.label}
          targetUserId={moment.user_id}
          targetUsername={ownerUsername}
        />
      ) : null}

      <GlassBottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={isShare ? `${mediaLexicon.share.delete}?` : `${mediaLexicon.moment.delete}?`}
        heightFraction={0.34}
      >
        <View style={styles.confirmBody}>
          <Text style={styles.confirmCopy}>This can&apos;t be undone.</Text>
          <Pressable style={styles.confirmDeleteBtn} onPress={() => void onDelete()}>
            <Text style={styles.confirmDeleteLabel}>
              {isShare ? mediaLexicon.share.delete : mediaLexicon.moment.delete}
            </Text>
          </Pressable>
          <Pressable style={styles.confirmCancelBtn} onPress={() => setConfirmDelete(false)}>
            <Text style={styles.confirmCancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </GlassBottomSheet>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    maxWidth: layout.contentMaxWidth,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.pageHeaderBorder,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: 12,
    gap: 8,
  },
  menuTrigger: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backChevron: {
    fontSize: 17,
    color: colors.textWhite78,
    marginTop: -1,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  headerUser: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  headerTime: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textWhite45,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 12,
  },
  mediaBleed: {
    marginHorizontal: -layout.screenPaddingX,
  },
  mediaBurstWrap: {
    position: "relative",
  },
  momentFrameShadow: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 8,
  },
  mediaSkeleton: {
    marginHorizontal: 12,
    marginTop: 12,
    alignSelf: "center",
  },
  staticMediaBlock: {
    backgroundColor: mediaLayout.placeholderColor,
  },
  staticLineWide: {
    width: 120,
    height: 14,
    borderRadius: 6,
    backgroundColor: mediaLayout.placeholderColor,
  },
  staticLineNarrow: {
    marginTop: 6,
    width: 80,
    height: 11,
    borderRadius: 6,
    backgroundColor: mediaLayout.placeholderColor,
  },
  staticActionBlock: {
    width: 80,
    height: 20,
    borderRadius: 6,
    backgroundColor: mediaLayout.placeholderColor,
  },
  staticActionBlockSmall: {
    width: 48,
    height: 20,
    borderRadius: 6,
    backgroundColor: mediaLayout.placeholderColor,
  },
  actionsSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  likeHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  count: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    fontVariant: ["tabular-nums"],
  },
  commentHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 4,
  },
  commentCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  likedBy: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite55,
    paddingHorizontal: 4,
  },
  commentPanel: {
    borderRadius: layout.cardRadius,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    maxHeight: 208,
  },
  noComments: {
    fontSize: 12,
    color: colors.textWhite50,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commentRemove: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  commentTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  commentBody: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255, 255, 255, 0.85)",
  },
  viewAllComments: {
    paddingTop: 4,
  },
  viewAllCommentsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentActive,
  },
  unavailable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  unavailableTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite85,
    textAlign: "center",
  },
  unavailableBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite45,
    textAlign: "center",
    maxWidth: 300,
  },
  err: {
    marginTop: 12,
    fontSize: 12,
    color: colors.danger,
    textAlign: "center",
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
