import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassBottomSheet, GlassSheetDismissScrollView } from "../ui/GlassBottomSheet";
import { SkeletonCircle, SkeletonLine } from "../ui/Skeleton";
import { ProfileAvatar } from "../ProfileAvatar";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { useMyAvatar } from "../../hooks/useMyAvatar";
import { useAuth } from "../../providers/AuthProvider";
import { isStoryRowShareFlag } from "../../lib/hubFeedSemantics";
import { createStoryCommentNotification } from "../../lib/createNotification";
import { getCachedShareStats } from "../../lib/shareStatsCache";
import { supabase } from "../../lib/supabase/client";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";
import { motion } from "../../theme/motion";
import { mediaLexicon } from "../../content/mediaLexicon";
import { ReportContentSheet } from "../moderation/ReportContentSheet";
import { useReportedContent } from "../../providers/ReportedContentProvider";

const QUICK_REACTIONS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

type ViewerComment = {
  id: string;
  user_id: string;
  content: string;
  username: string | null;
  avatar_url: string | null;
};

type ShareCommentsBottomSheetProps = {
  storyId: string | null;
  onClose: () => void;
  onCommentsChanged?: (storyId: string, delta: number) => void;
};

function seedCommentsFromCache(storyId: string): ViewerComment[] {
  const cached = getCachedShareStats(storyId);
  if (!cached?.commentPreviews.length) return [];
  return cached.commentPreviews.map((c) => ({
    id: c.id,
    user_id: "",
    content: c.content,
    username: c.username,
    avatar_url: null,
  }));
}

function ShareCommentsSheetBody({ children }: { children: ReactNode }) {
  return <View style={styles.bodyHost}>{children}</View>;
}

type ShareCommentsListProps = {
  comments: ViewerComment[];
  userId?: string;
  ownerUserId: string | null;
  canRemoveComment: (comment: ViewerComment) => boolean;
  onDeleteComment: (comment: ViewerComment) => void;
  onReportComment: (comment: ViewerComment) => void;
  listRef: React.RefObject<ComponentRef<typeof Animated.ScrollView> | null>;
  onScrollToEnd: () => void;
};

function ShareCommentsList({
  comments,
  userId,
  ownerUserId,
  canRemoveComment,
  onDeleteComment,
  onReportComment,
  listRef,
  onScrollToEnd,
}: ShareCommentsListProps) {
  const { isCommentReported } = useReportedContent();

  useEffect(() => {
    onScrollToEnd();
  }, [comments.length, onScrollToEnd]);

  return (
    <Animated.View entering={FadeIn.duration(motion.fade.content)} style={styles.listHost}>
      <GlassSheetDismissScrollView
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {comments.length === 0 ? (
          <Text style={styles.empty}>No comments yet.</Text>
        ) : (
          comments.map((c) => {
            if (isCommentReported(c.id)) {
              return (
                <View key={c.id} style={styles.reportedCommentRow}>
                  <Text style={styles.reportedCommentText}>You reported this comment. It stays hidden for you.</Text>
                </View>
              );
            }

            const canDelete = canRemoveComment(c);
            const canReport = !!userId && c.user_id !== userId;
            return (
              <View key={c.id} style={styles.commentRow}>
                <ProfileAvatar avatarUrl={c.avatar_url} label={c.username ?? "user"} size={40} bordered={false} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentText}>
                    <Text style={styles.commentUser}>{c.username?.trim() || "user"}</Text>
                    <Text style={styles.commentMuted}> </Text>
                    {c.content}
                  </Text>
                </View>
                <View style={styles.commentActions}>
                  {canDelete ? (
                    <Pressable onPress={() => onDeleteComment(c)} hitSlop={8}>
                      <Text style={styles.remove}>
                        {ownerUserId === userId && c.user_id !== userId ? "Delete" : "Remove"}
                      </Text>
                    </Pressable>
                  ) : null}
                  {canReport ? (
                    <Pressable onPress={() => onReportComment(c)} hitSlop={8}>
                      <Text style={styles.reportLink}>Report</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </GlassSheetDismissScrollView>
    </Animated.View>
  );
}

/** PWA `ShareCommentsBottomSheet` — slide-up comments with glass composer. */
export function ShareCommentsBottomSheet({ storyId, onClose, onCommentsChanged }: ShareCommentsBottomSheetProps) {
  const { user } = useAuth();
  const { avatarUrl: myAvatarUrl, label: myLabel } = useMyAvatar();
  const { visible: keyboardVisible } = useKeyboardInset();
  const listRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const [hydrated, setHydrated] = useState(false);
  const [available, setAvailable] = useState(true);
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [reportComment, setReportComment] = useState<ViewerComment | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const loadedStoryIdRef = useRef<string | null>(null);

  const scrollToLatest = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (!keyboardVisible) return;
    scrollToLatest();
  }, [keyboardVisible, scrollToLatest]);

  const load = useCallback(async () => {
    if (!storyId) return;
    const isNewStory = loadedStoryIdRef.current !== storyId;
    if (isNewStory) {
      const seed = seedCommentsFromCache(storyId);
      setComments(seed);
      setHydrated(seed.length > 0);
    }
    setAvailable(true);
    try {
      const { data: story } = await supabase
        .from("stories")
        .select("id, user_id, is_share, share_visible, share_hidden")
        .eq("id", storyId)
        .maybeSingle();

      if (!story || !isStoryRowShareFlag(story.is_share)) {
        setAvailable(false);
        setOwnerUserId(null);
        return;
      }
      if (story.share_hidden || story.share_visible === false) {
        setAvailable(false);
        setOwnerUserId(null);
        return;
      }
      setOwnerUserId(story.user_id ?? null);

      const { data: commentRows } = await supabase
        .from("story_comments")
        .select("id, user_id, content, created_at")
        .eq("story_id", storyId)
        .order("created_at", { ascending: true });

      const rows = (commentRows ?? []) as Array<{ id: string; user_id: string; content: string }>;
      const ids = Array.from(new Set(rows.map((c) => c.user_id)));
      const profileById: Record<string, { username: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
        for (const p of profs ?? []) {
          profileById[p.id] = { username: p.username ?? null, avatar_url: p.avatar_url ?? null };
        }
      }
      setComments(
        rows.map((c) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          username: profileById[c.user_id]?.username ?? null,
          avatar_url: profileById[c.user_id]?.avatar_url ?? null,
        }))
      );
      loadedStoryIdRef.current = storyId;
    } finally {
      setHydrated(true);
    }
  }, [storyId]);

  useEffect(() => {
    if (!storyId) return;
    if (loadedStoryIdRef.current === storyId && hydrated) return;
    void load();
  }, [storyId, load, hydrated]);

  const sendComment = async () => {
    if (!storyId || !user?.id) return;
    const text = commentText.trim();
    if (!text || sending) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ViewerComment = {
      id: optimisticId,
      user_id: user.id,
      content: text,
      username: null,
      avatar_url: myAvatarUrl,
    };

    setCommentError(null);
    setCommentText("");
    setComments((prev) => [...prev, optimistic]);
    onCommentsChanged?.(storyId, 1);
    scrollToLatest();
    setSending(true);

    const { data: inserted, error } = await supabase
      .from("story_comments")
      .insert({ story_id: storyId, user_id: user.id, content: text })
      .select("id")
      .single();

    setSending(false);

    if (error || !inserted?.id) {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      onCommentsChanged?.(storyId, -1);
      setCommentText(text);
      setCommentError(error?.message ?? "Could not post comment. Try again.");
      return;
    }

    setComments((prev) =>
      prev.map((c) => (c.id === optimisticId ? { ...c, id: inserted.id as string } : c))
    );

    if (ownerUserId && ownerUserId !== user.id) {
      void createStoryCommentNotification({
        recipientId: ownerUserId,
        actorId: user.id,
        storyId,
        commentPreview: text,
        isShare: true,
      });
    }
  };

  const deleteComment = async (comment: ViewerComment) => {
    if (!storyId || !user?.id) return;
    const { error } = await supabase.from("story_comments").delete().eq("id", comment.id);
    if (error) {
      setCommentError(error.message ?? "Could not remove comment.");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    onCommentsChanged?.(storyId, -1);
  };

  const canRemoveComment = (comment: ViewerComment) => {
    if (!user?.id) return false;
    if (comment.user_id === user.id) return true;
    return ownerUserId === user.id;
  };

  const composer = (
    <View style={styles.composerWrap}>
      {commentError ? <Text style={styles.commentError}>{commentError}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
        {QUICK_REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => setCommentText((t) => `${t}${emoji}`)}
            style={styles.emojiBtn}
            accessibilityLabel={`Add ${emoji}`}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.composerRow}>
        <ProfileAvatar avatarUrl={myAvatarUrl} label={myLabel} size={32} bordered={false} />
        <TextInput
          style={styles.input}
          value={commentText}
          onChangeText={setCommentText}
          placeholder={user?.id ? "Don't hold back" : "Sign in to comment"}
          placeholderTextColor={colors.textWhite42}
          editable={Boolean(user?.id) && !sending}
          multiline
          maxLength={500}
          onFocus={scrollToLatest}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={() => void sendComment()}
          disabled={!user?.id || !commentText.trim() || sending}
          style={[styles.sendBtn, (!user?.id || !commentText.trim() || sending) && styles.sendBtnDisabled]}
        >
          <Text style={styles.sendBtnLabel}>{sending ? "…" : "Send"}</Text>
        </Pressable>
      </View>
    </View>
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  return (
    <>
      <GlassBottomSheet
        visible={!!storyId}
        onClose={handleClose}
        title="Comments"
        footer={available ? composer : undefined}
        heightFraction={0.82}
        keyboardAware
        showCloseButton={false}
        enableBodyDismissPan
      >
        {!hydrated ? (
          <ShareCommentsSheetBody>
            <View style={styles.listContent}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.commentRow}>
                  <SkeletonCircle size={40} />
                  <View style={styles.commentBody}>
                    <SkeletonLine width="40%" height={10} />
                    <SkeletonLine width="85%" height={12} style={{ marginTop: 8 }} />
                  </View>
                </View>
              ))}
            </View>
          </ShareCommentsSheetBody>
        ) : !available ? (
          <ShareCommentsSheetBody>
            <View style={styles.centered}>
              <Text style={styles.unavailTitle}>{mediaLexicon.unavailable.title}</Text>
              <Text style={styles.unavailBody}>This share isn&apos;t available right now.</Text>
              <Pressable onPress={handleClose} style={styles.unavailClose}>
                <Text style={styles.unavailCloseLabel}>Close</Text>
              </Pressable>
            </View>
          </ShareCommentsSheetBody>
        ) : (
          <ShareCommentsList
            comments={comments}
            userId={user?.id}
            ownerUserId={ownerUserId}
            canRemoveComment={canRemoveComment}
            onDeleteComment={(c) => void deleteComment(c)}
            onReportComment={setReportComment}
            listRef={listRef}
            onScrollToEnd={scrollToLatest}
          />
        )}
      </GlassBottomSheet>
      {reportComment ? (
        <ReportContentSheet
          visible
          onClose={() => setReportComment(null)}
          targetType="comment"
          targetId={reportComment.id}
          contentLabel="comment"
          targetUserId={reportComment.user_id || undefined}
          targetUsername={reportComment.username}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bodyHost: {
    flex: 1,
    minHeight: 0,
  },
  listHost: {
    flex: 1,
    minHeight: 0,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  unavailTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite85,
  },
  unavailBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite45,
    textAlign: "center",
  },
  unavailClose: {
    marginTop: 12,
    borderRadius: layout.pillRadius,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  unavailCloseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    flexGrow: 1,
  },
  empty: {
    textAlign: "center",
    fontSize: 13,
    color: colors.textWhite45,
    paddingVertical: 40,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.88)",
  },
  commentUser: {
    fontWeight: "600",
    color: colors.textPrimary,
  },
  commentMuted: {
    color: colors.textWhite55,
  },
  commentActions: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 4,
  },
  commentError: {
    fontSize: 12,
    color: "#f87171",
    marginBottom: 6,
  },
  reportLink: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  reportedCommentRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  reportedCommentText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  remove: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textWhite42,
  },
  composerWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  emojiRow: {
    gap: 4,
    paddingHorizontal: 2,
  },
  emojiBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 18,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingBottom: 4,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    borderRadius: layout.pillRadius,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 56,
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
});
