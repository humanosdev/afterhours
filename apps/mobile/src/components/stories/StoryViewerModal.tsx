import { Heart, MessageCircle, MoreHorizontal, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { ModalGestureRoot } from "../ModalGestureRoot";
import { StoryViewerMediaLayer } from "./StoryViewerMediaLayer";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardDismissPan } from "../../hooks/useKeyboardDismissPan";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { keyboardComposerInsets } from "../../lib/keyboardComposerInsets";
import { deleteHubShare } from "../../lib/hubShareMutations";
import { performShareLike } from "../../lib/performShareLike";
import { prefetchStoryMediaUri } from "../../lib/prefetchStoryMedia";
import { recordStoryViewDefault } from "../../lib/storyViews";
import {
  fetchHubShareFeedCardStates,
  fetchLikedByFriendsLineForStory,
} from "../../lib/storyFeedInteractions";
import { getCachedShareStats } from "../../lib/shareStatsCache";
import { subscribeShareLikeUpdated } from "../../lib/shareLikeEvents";
import type { StoryViewerReviewMode } from "../../providers/CreateComposerProvider";
import type { StoryViewerGroup } from "../../lib/storyViewerTypes";
import { formatSocialAgo } from "../../lib/socialTime";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../providers/AuthProvider";
import { mediaLexicon, storyKindLabelFromRow } from "../../content/mediaLexicon";
import { colors } from "../../theme/colors";
import { momentViewerStageMetrics } from "../../theme/momentStageLayout";
import { IconHitTarget } from "../IconHitTarget";
import { ProfileAvatar } from "../ProfileAvatar";
import { useCreateComposer } from "../../providers/CreateComposerProvider";
import { getOrCreateChat } from "../../lib/getOrCreateChat";
import { getPairBlockStatus } from "../../lib/pairBlockStatus";
import { sendChatMessage } from "../../lib/sendChatMessage";
import { ReportContentSheet } from "../moderation/ReportContentSheet";
import { ReportedContentCover } from "../moderation/ReportedContentCover";
import { useReportedContent } from "../../providers/ReportedContentProvider";
import { StoryViewerReplyBar } from "./StoryViewerReplyBar";
import { StoryViewerProgressBars } from "./StoryViewerProgressBars";

type StoryViewerModalProps = {
  visible: boolean;
  groups: StoryViewerGroup[];
  groupIndex: number;
  storyIndex: number;
  onGroupIndexChange: (index: number) => void;
  onStoryIndexChange: (index: number) => void;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
  reviewMode?: StoryViewerReviewMode | null;
};

/** PWA `StoryViewerModal` — fullscreen progression, tap zones, swipe-down close, ring queue. */
export function StoryViewerModal({
  visible,
  groups,
  groupIndex,
  storyIndex,
  onGroupIndexChange,
  onStoryIndexChange,
  onClose,
  onStoryDeleted,
  reviewMode = null,
}: StoryViewerModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { inset: keyboardInset, visible: keyboardVisible, dismiss: dismissKeyboard } = useKeyboardInset();
  const replyDismissPan = useKeyboardDismissPan(dismissKeyboard, keyboardVisible);
  const replyComposerInsets = keyboardComposerInsets({
    keyboardInset,
    safeBottom: insets.bottom,
    restingPad: 8,
  });
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const { openShareComments, shareCommentsStoryId } = useCreateComposer();
  const { isStoryReported } = useReportedContent();
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likedByLine, setLikedByLine] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [holdPaused, setHoldPaused] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const activeStoryIdRef = useRef<string | null>(null);

  const safeGroupIndex = groups.length ? Math.min(Math.max(0, groupIndex), groups.length - 1) : 0;
  const group = groups[safeGroupIndex] ?? null;
  const stories = useMemo(() => {
    const raw = group?.stories ?? [];
    if (!group?.user_id) return raw;
    return raw.filter((s) => s.user_id === group.user_id);
  }, [group?.stories, group?.user_id]);
  const safeIndex = stories.length ? Math.min(storyIndex, stories.length - 1) : 0;
  const activeStory = stories[safeIndex] ?? null;
  const activeIsShare = !!activeStory?.is_share;
  const isOwner = !!user?.id && activeStory?.user_id === user.id;
  const reported = activeStory ? isStoryReported(activeStory.id) : false;
  const storyIds = useMemo(() => stories.map((s) => s.id), [stories]);
  const mountedStoryIndices = useMemo(() => {
    const indices: number[] = [];
    for (let d = -1; d <= 1; d++) {
      const i = safeIndex + d;
      if (i >= 0 && i < stories.length) indices.push(i);
    }
    return indices;
  }, [safeIndex, stories.length]);
  const commentsOpenForViewer =
    visible && !!shareCommentsStoryId && shareCommentsStoryId === activeStory?.id;
  const isExpiredArchiveReview = reviewMode === "expired-archive";
  const paused =
    isExpiredArchiveReview ||
    commentsOpenForViewer ||
    menuOpen ||
    holdPaused ||
    replySending;
  const momentStage = useMemo(
    () => momentViewerStageMetrics(windowWidth, windowHeight, insets),
    [windowWidth, windowHeight, insets]
  );

  const sendStoryReply = useCallback(
    async (text: string) => {
      if (!user?.id || !activeStory?.user_id || !activeStory.id || isOwner) return;
      setReplySending(true);
      try {
        const block = await getPairBlockStatus(user.id, activeStory.user_id);
        if (block !== "none") {
          Alert.alert("Message", "You can't message this user right now.");
          return;
        }
        const chatResult = await getOrCreateChat(user.id, activeStory.user_id);
        if ("error" in chatResult) {
          Alert.alert("Message", "Could not start chat. Try again.");
          return;
        }
        const sendResult = await sendChatMessage({
          chatId: chatResult.chatId,
          meId: user.id,
          receiverId: activeStory.user_id,
          content: text,
          storyId: activeStory.id,
          storyAttachment: {
            id: activeStory.id,
            media_url: activeStory.media_url,
            is_share: !!activeStory.is_share,
          },
        });
        if (!sendResult.ok) {
          Alert.alert("Message", "Could not send reply.");
        }
      } finally {
        setReplySending(false);
      }
    },
    [user?.id, activeStory, isOwner]
  );

  const close = useCallback(() => {
    setMenuOpen(false);
    onClose();
  }, [onClose]);

  const goToGroup = useCallback(
    (nextGroupIndex: number, nextStoryIndex: number) => {
      onGroupIndexChange(nextGroupIndex);
      onStoryIndexChange(nextStoryIndex);
      setMenuOpen(false);
    },
    [onGroupIndexChange, onStoryIndexChange]
  );

  const nextStory = useCallback(() => {
    if (!stories.length) return close();
    if (safeIndex < stories.length - 1) {
      onStoryIndexChange(safeIndex + 1);
      return;
    }
    const nextGroup = safeGroupIndex + 1;
    if (nextGroup < groups.length) {
      goToGroup(nextGroup, 0);
      return;
    }
    close();
  }, [
    stories.length,
    safeIndex,
    safeGroupIndex,
    groups.length,
    close,
    onStoryIndexChange,
    goToGroup,
  ]);

  const prevStory = useCallback(() => {
    if (safeIndex > 0) {
      onStoryIndexChange(safeIndex - 1);
      return;
    }
    if (safeGroupIndex <= 0) return;
    const prevGroup = groups[safeGroupIndex - 1];
    const lastIdx = Math.max(0, (prevGroup?.stories.length ?? 1) - 1);
    goToGroup(safeGroupIndex - 1, lastIdx);
  }, [safeIndex, safeGroupIndex, groups, onStoryIndexChange, goToGroup]);

  const goToStoryAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= stories.length || index === safeIndex) return;
      onStoryIndexChange(index);
      setMenuOpen(false);
    },
    [stories.length, safeIndex, onStoryIndexChange]
  );

  useEffect(() => {
    if (!visible) {
      setMenuOpen(false);
      setHoldPaused(false);
    }
  }, [visible]);

  useEffect(() => {
    activeStoryIdRef.current = activeStory?.id ?? null;
  }, [activeStory?.id]);

  useEffect(() => {
    if (!visible || !stories.length) return;
    for (const s of stories) {
      if (s.media_url) void prefetchStoryMediaUri(s.media_url);
    }
  }, [visible, group?.user_id, stories]);

  useEffect(() => {
    if (!visible || !activeStory) return;
    const prevInGroup = stories[safeIndex - 1];
    if (prevInGroup?.media_url) void prefetchStoryMediaUri(prevInGroup.media_url);
    const nextInGroup = stories[safeIndex + 1];
    if (nextInGroup?.media_url) void prefetchStoryMediaUri(nextInGroup.media_url);
    const nextGroup = groups[safeGroupIndex + 1];
    const firstNext = nextGroup?.stories[0];
    if (firstNext?.media_url) void prefetchStoryMediaUri(firstNext.media_url);
    const prevGroup = groups[safeGroupIndex - 1];
    const lastPrev = prevGroup?.stories[prevGroup.stories.length - 1];
    if (lastPrev?.media_url) void prefetchStoryMediaUri(lastPrev.media_url);
  }, [visible, activeStory?.id, safeIndex, safeGroupIndex, stories, groups]);

  useEffect(() => {
    if (!visible || !user?.id || !activeStory?.id || activeIsShare) return;
    void recordStoryViewDefault(user.id, activeStory.id);
  }, [visible, user?.id, activeStory?.id, activeIsShare]);

  useEffect(() => {
    if (!visible || !activeStory?.id) return;
    const cached = getCachedShareStats(activeStory.id);
    if (cached) {
      setLikesCount(cached.likesCount);
      setLiked(cached.liked);
      setLikedByLine(activeIsShare ? cached.likedByLine : null);
    }
    let cancelled = false;
    void fetchHubShareFeedCardStates([activeStory.id], user?.id ?? null, []).then((patch) => {
      if (cancelled) return;
      const row = patch[activeStory.id];
      if (!row) return;
      setLikesCount(row.likesCount);
      setLiked(row.liked);
      setLikedByLine(activeIsShare ? row.likedByLine : null);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, activeStory?.id, user?.id, activeIsShare]);

  useEffect(() => {
    if (!visible || !activeStory?.id) return;
    return subscribeShareLikeUpdated((detail) => {
      if (detail.storyId !== activeStory.id) return;
      const row = getCachedShareStats(activeStory.id);
      if (!row) return;
      setLikesCount(row.likesCount);
      setLiked(row.liked);
      if (activeIsShare) setLikedByLine(row.likedByLine);
    });
  }, [visible, activeStory?.id, activeIsShare]);

  const panClose = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(14)
        .failOffsetX([-28, 28])
        .onEnd((e) => {
          if (e.translationY > 72 || e.velocityY > 900) runOnJS(close)();
        }),
    [close]
  );

  const tapNav = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(260)
        .onEnd((e) => {
          const x = e.x;
          if (x < windowWidth * 0.28) runOnJS(prevStory)();
          else if (x > windowWidth * 0.72) runOnJS(nextStory)();
        }),
    [windowWidth, prevStory, nextStory]
  );

  const holdPause = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(120)
        .maxDistance(20)
        .onStart(() => runOnJS(setHoldPaused)(true))
        .onFinalize(() => runOnJS(setHoldPaused)(false)),
    []
  );

  const touchLayer = useMemo(
    () => Gesture.Simultaneous(panClose, Gesture.Race(tapNav, holdPause)),
    [panClose, tapNav, holdPause]
  );

  function applyLikeFromCache() {
    if (!activeStory) return;
    const row = getCachedShareStats(activeStory.id);
    if (!row) return;
    setLikesCount(row.likesCount);
    setLiked(row.liked);
    if (activeIsShare) setLikedByLine(row.likedByLine);
  }

  function toggleLike() {
    if (!activeStory || !user?.id) return;
    void performShareLike({
      storyId: activeStory.id,
      meId: user.id,
      ownerUserId: activeStory.user_id,
      currentlyLiked: liked,
      onOptimistic: () => applyLikeFromCache(),
      onReconcile: async () => {
        if (!activeIsShare || !user.id) return;
        const line = await fetchLikedByFriendsLineForStory(activeStory.id, user.id, []);
        setLikedByLine(line);
      },
    });
  }

  async function deleteStory() {
    if (!activeStory || !user?.id || !isOwner) return;
    Alert.alert(
      activeIsShare ? `${mediaLexicon.share.delete}?` : `${mediaLexicon.moment.delete}?`,
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { ok, error } = await deleteHubShare(activeStory.id, user.id);
            if (!ok) {
              Alert.alert("Could not delete", error ?? "Try again");
              return;
            }
            onStoryDeleted?.(activeStory.id);
            close();
          },
        },
      ]
    );
  }

  const headerProfilePress = useCallback(() => {
    if (!group) return;
    if (user?.id && group.user_id === user.id) {
      close();
      router.push("/profile");
      return;
    }
    if (group.username) {
      close();
      router.push(`/u/${encodeURIComponent(group.username)}`);
    }
  }, [group, user?.id, close, router]);

  if (!visible || !groups.length || !group) return null;

  return (
    <>
      <ModalGestureRoot visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
        <View style={styles.root}>
          <ReportedContentCover storyId={activeStory?.id ?? ""} style={styles.mediaStack}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {mountedStoryIndices.map((i) => {
              const story = stories[i];
              if (!story?.media_url) return null;
              const isActive = i === safeIndex;
              return (
                <View
                  key={story.id}
                  style={[
                    styles.mediaLayer,
                    { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 },
                  ]}
                  pointerEvents="none"
                >
                  <StoryViewerMediaLayer
                    storyId={story.id}
                    mediaUrl={story.media_url}
                    isShare={!!story.is_share}
                    shareAspect={story.share_aspect}
                  />
                </View>
              );
            })}
            {!activeStory?.media_url ? (
              <View style={[styles.mediaLayer, styles.mediaPlaceholder]} pointerEvents="none" />
            ) : null}
          </View>
          </ReportedContentCover>

          <View style={styles.chrome} pointerEvents="box-none">
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "transparent"]}
            style={styles.topGradient}
            pointerEvents="none"
          />

          <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
            <StoryViewerProgressBars
              storyIds={storyIds}
              activeIndex={safeIndex}
              paused={paused}
              onSegmentComplete={nextStory}
              onSegmentPress={goToStoryAt}
            />

            <View style={styles.headerRow} pointerEvents="box-none">
              <Pressable onPress={headerProfilePress} style={styles.identity} accessibilityRole="button">
                <ProfileAvatar
                  avatarUrl={group.avatar_url ?? null}
                  label={group.username ?? "user"}
                  size={36}
                  bordered={false}
                />
                <View style={styles.identityText}>
                  <Text style={styles.identityName} numberOfLines={1}>
                    {group.username ?? "user"}
                  </Text>
                  <Text style={styles.identityTime} numberOfLines={1}>
                    {activeStory
                      ? `${formatSocialAgo(activeStory.created_at)} · ${storyKindLabelFromRow(activeIsShare)}`
                      : ""}
                  </Text>
                </View>
              </Pressable>

              {isOwner ? (
                <View>
                  <IconHitTarget
                    onPress={() => setMenuOpen((v) => !v)}
                    accessibilityLabel="Options"
                    size={40}
                  >
                    <MoreHorizontal size={20} color="#fff" />
                  </IconHitTarget>
                  {menuOpen ? (
                    <View style={styles.menu}>
                      <Pressable onPress={() => void deleteStory()} style={styles.menuItem}>
                        <Text style={styles.menuDelete}>Delete</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : activeStory && !reported ? (
                <View>
                  <IconHitTarget
                    onPress={() => setMenuOpen((v) => !v)}
                    accessibilityLabel="Options"
                    size={40}
                  >
                    <MoreHorizontal size={20} color="#fff" />
                  </IconHitTarget>
                  {menuOpen ? (
                    <View style={styles.menu}>
                      <Pressable
                        onPress={() => {
                          setMenuOpen(false);
                          setReportOpen(true);
                        }}
                        style={styles.menuItem}
                      >
                        <Text style={styles.menuItemLabel}>Report</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <IconHitTarget onPress={close} accessibilityLabel="Close" size={40}>
                <X size={20} color="#fff" strokeWidth={2.2} />
              </IconHitTarget>
            </View>
          </View>

          <GestureDetector gesture={touchLayer}>
            <View
              style={[
                styles.tapRow,
                activeIsShare
                  ? null
                  : {
                      top: momentStage.top,
                      bottom: momentStage.bottomDockHeight,
                    },
              ]}
            />
          </GestureDetector>

          {isExpiredArchiveReview ? null : (
          <View
            style={[
              styles.footerDock,
              {
                marginBottom: replyComposerInsets.marginBottom,
              },
            ]}
            pointerEvents="box-none"
            {...replyDismissPan}
          >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.75)", "rgba(0,0,0,0.92)"]}
            style={[styles.footer, { paddingBottom: replyComposerInsets.paddingBottom }]}
            pointerEvents="box-none"
          >
            {!isOwner && user?.id && activeStory?.user_id ? (
              <View style={styles.replyRow}>
                <StoryViewerReplyBar
                  disabled={!activeStory}
                  sending={replySending}
                  onSend={(text) => void sendStoryReply(text)}
                />
                <Pressable onPress={toggleLike} style={styles.footerHeartBtn} accessibilityRole="button">
                  <Heart
                    size={26}
                    color={liked ? "#ef4444" : "#fff"}
                    fill={liked ? "#ef4444" : "transparent"}
                    strokeWidth={1.75}
                  />
                </Pressable>
              </View>
            ) : reported ? null : (
              <View style={styles.footerActions}>
                <Pressable onPress={toggleLike} style={styles.likeBtn} accessibilityRole="button">
                  <Heart
                    size={28}
                    color={liked ? "#ef4444" : "#fff"}
                    fill={liked ? "#ef4444" : "transparent"}
                    strokeWidth={1.75}
                  />
                  <Text style={styles.likeCount}>{likesCount}</Text>
                </Pressable>
                {activeIsShare && activeStory ? (
                  <Pressable
                    onPress={() =>
                      openShareComments(activeStory.id, {
                        onCommentsChanged: () => {
                          /* Hub uses optimistic delta; viewer has no inline count — avoid reload. */
                        },
                      })
                    }
                    style={styles.commentBtn}
                    accessibilityRole="button"
                  >
                    <MessageCircle size={26} color="#fff" strokeWidth={1.75} />
                  </Pressable>
                ) : null}
              </View>
            )}
            {activeIsShare && likedByLine && !reported ? (
              <Text style={styles.likedByLine} numberOfLines={2}>
                {likedByLine}
              </Text>
            ) : null}
          </LinearGradient>
          </View>
          )}
          </View>
        </View>
      </ModalGestureRoot>
      {activeStory ? (
        <ReportContentSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="story"
          targetId={activeStory.id}
          contentLabel={activeIsShare ? mediaLexicon.share.label : mediaLexicon.moment.label}
          targetUserId={group.user_id}
          targetUsername={group.username}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  mediaStack: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaPlaceholder: {
    backgroundColor: "#141820",
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
  },
  header: {
    zIndex: 20,
    paddingHorizontal: 12,
  },
  headerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    overflow: "visible",
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    overflow: "visible",
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  identityName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  identityTime: {
    fontSize: 12,
    color: colors.textWhite42,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 44,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(13, 15, 22, 0.98)",
    overflow: "hidden",
    zIndex: 20,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  menuDelete: {
    fontSize: 13,
    fontWeight: "500",
    color: "#fca5a5",
  },
  tapRow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  footerDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    elevation: 30,
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerHeartBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textWhite85,
  },
  commentBtn: {
    padding: 8,
  },
  likedByLine: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textWhite55,
  },
});
