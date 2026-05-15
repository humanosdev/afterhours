"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";
import { formatRelativeTime } from "@/lib/time";
import { useRouter } from "next/navigation";
import { openShareCommentsSheet } from "@/lib/shareCommentsSheet";
import { Heart, MessageCircle, MoreHorizontal, X } from "lucide-react";
import { createNotification } from "@/lib/notifications";
import { fetchProfilesForStoryCommenters } from "@/lib/storyCommentProfiles";
import { fetchLikedByFriendsLineForStory } from "@/lib/storyFeedInteractions";
import { recordStoryView } from "@/lib/storyViews";

export type StoryViewerStory = {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  expires_at: string | null;
  is_share?: boolean;
};

export type StoryViewerGroup = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  stories: StoryViewerStory[];
};

type ViewerComment = {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
};

export default function StoryViewerModal({
  open,
  group,
  initialIndex = 0,
  currentUserId,
  onClose,
  onStoryDeleted,
}: {
  open: boolean;
  group: StoryViewerGroup | null;
  initialIndex?: number;
  currentUserId: string | null;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
}) {
  const router = useRouter();
  const [storyIndex, setStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [likedByLine, setLikedByLine] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [myProfile, setMyProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const touchStartY = useRef<number | null>(null);

  const stories = group?.stories ?? [];
  const safeStoryIndex = stories.length ? Math.min(storyIndex, stories.length - 1) : 0;
  const activeStory = stories[safeStoryIndex] ?? null;
  const activeIsShare = !!activeStory?.is_share;
  const isStoryOwner = !!currentUserId && !!activeStory && currentUserId === activeStory.user_id;

  useEffect(() => {
    if (!open) {
      setStoryIndex(0);
      return;
    }
    const len = group?.stories?.length ?? 0;
    const maxIdx = Math.max(0, len - 1);
    setStoryIndex(Math.min(Math.max(0, initialIndex), maxIdx));
    setProgress(0);
    setMenuOpen(false);
  }, [open, initialIndex, group?.user_id, group?.stories?.length]);

  useEffect(() => {
    if (!open || !currentUserId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", currentUserId)
        .maybeSingle();
      setMyProfile({
        username: data?.username ?? null,
        avatar_url: (data?.avatar_url ?? "").trim() || null,
      });
    })();
  }, [open, currentUserId]);

  const relativeTime = (createdAt: string) => {
    return formatRelativeTime(createdAt);
  };

  const close = () => {
    setMenuOpen(false);
    onClose();
  };

  const nextStory = () => {
    if (!stories.length) return close();
    if (safeStoryIndex >= stories.length - 1) return close();
    setStoryIndex(safeStoryIndex + 1);
    setProgress(0);
  };

  const prevStory = () => {
    if (safeStoryIndex <= 0) return;
    setStoryIndex(safeStoryIndex - 1);
    setProgress(0);
  };

  useEffect(() => {
    if (!open || !activeStory) return;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          nextStory();
          return 0;
        }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [open, activeStory?.id, storyIndex, stories.length]);

  useEffect(() => {
    if (!activeStory) return;
    const next = stories[storyIndex + 1];
    if (!next?.media_url) return;
    const img = new Image();
    img.src = next.media_url;
  }, [activeStory?.id, storyIndex, stories]);

  useEffect(() => {
    if (!open || !currentUserId || !activeStory?.id || activeIsShare) return;
    /** Include own stories so hub/profile “seen” rings match friends (RLS allows self). */
    void recordStoryView(supabase, currentUserId, activeStory.id);
  }, [open, currentUserId, activeStory?.id, activeIsShare, activeStory?.user_id]);

  useEffect(() => {
    if (!open || !activeStory) return;
    let mounted = true;
    const loadMeta = async () => {
      setLoadingMeta(true);
      const [{ count, error: likesCountError }, likedRes, commentsRes] = await Promise.all([
        supabase
          .from("story_likes")
          .select("id", { count: "exact", head: true })
          .eq("story_id", activeStory.id),
        currentUserId
          ? supabase
              .from("story_likes")
              .select("id")
              .eq("story_id", activeStory.id)
              .eq("user_id", currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        activeIsShare
          ? supabase
              .from("story_comments")
              .select("id, story_id, user_id, content, created_at")
              .eq("story_id", activeStory.id)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as any[], error: null } as any),
      ]);

      if (likesCountError) console.error(likesCountError);
      if (likedRes?.error) console.error(likedRes.error);
      if (commentsRes?.error) console.error(commentsRes.error);
      if (!mounted) return;

      setLikesCount(count ?? 0);
      setLiked(!!likedRes?.data);

      if (!activeIsShare) {
        if (mounted) setLikedByLine(null);
      }

      const commentRows = (commentsRes?.data ?? []) as any[];
      const ids = Array.from(new Set(commentRows.map((c) => c.user_id).filter(Boolean)));
      const profileById =
        activeIsShare && ids.length
          ? await fetchProfilesForStoryCommenters(supabase, activeStory.id, ids)
          : {};
      if (!mounted) return;
      setComments(
        commentRows.map((c) => ({
          id: c.id,
          story_id: c.story_id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          username: profileById[c.user_id]?.username ?? null,
          avatar_url: profileById[c.user_id]?.avatar_url ?? null,
        }))
      );
      if (activeIsShare && currentUserId) {
        const line = await fetchLikedByFriendsLineForStory(supabase, activeStory.id, currentUserId);
        if (mounted) setLikedByLine(line);
      } else if (mounted) {
        setLikedByLine(null);
      }
      setLoadingMeta(false);
    };
    loadMeta();
    return () => {
      mounted = false;
    };
  }, [open, activeStory?.id, currentUserId, activeIsShare]);

  const toggleLike = async () => {
    if (!activeStory || !currentUserId) return;
    if (liked) {
      const { error } = await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", activeStory.id)
        .eq("user_id", currentUserId);
      if (error) {
        console.error(error);
        alert("Action failed");
        return;
      }
      setLiked(false);
      setLikesCount((c) => Math.max(0, c - 1));
      if (activeIsShare) {
        window.dispatchEvent(new CustomEvent("ah-share-likes-updated", { detail: { storyId: activeStory.id } }));
      }
      if (activeIsShare && currentUserId) {
        const line = await fetchLikedByFriendsLineForStory(supabase, activeStory.id, currentUserId);
        setLikedByLine(line);
      }
      return;
    }
    const { error } = await supabase.from("story_likes").insert({
      story_id: activeStory.id,
      user_id: currentUserId,
    });
    if (error) {
      console.error(error);
      alert("Action failed");
      return;
    }
    setLiked(true);
    setLikesCount((c) => c + 1);
    if (activeIsShare) {
      window.dispatchEvent(new CustomEvent("ah-share-likes-updated", { detail: { storyId: activeStory.id } }));
    }
    if (activeStory.user_id !== currentUserId) {
      await createNotification({
        recipientId: activeStory.user_id,
        actorId: currentUserId,
        type: "story_like",
        storyId: activeStory.id,
        dedupeKey: `story_like:${activeStory.id}:${currentUserId}`,
        pushTitle: `${myProfile?.username ?? "A friend"} liked your post`,
        pushBody: activeIsShare ? "They liked your share." : "They liked your moment.",
        route: `/moments/${activeStory.id}`,
      });
    }
    if (activeIsShare && currentUserId) {
      const line = await fetchLikedByFriendsLineForStory(supabase, activeStory.id, currentUserId);
      setLikedByLine(line);
    }
  };

  const deleteStory = async () => {
    if (!activeStory || !currentUserId || activeStory.user_id !== currentUserId) return;
    const confirmed = window.confirm(
      activeIsShare ? "Delete this share? This can’t be undone." : "Delete this moment? This can’t be undone."
    );
    if (!confirmed) return;
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", activeStory.id)
      .eq("user_id", currentUserId);
    if (error) {
      console.error(error);
      alert(error.message ? `Could not delete: ${error.message}` : "Could not delete. Try again.");
      return;
    }
    onStoryDeleted?.(activeStory.id);
    window.dispatchEvent(new Event("story-posted"));
    close();
  };

  const canOpen = useMemo(() => {
    if (!open || !activeStory) return false;
    return !!String(activeStory.media_url ?? "").trim();
  }, [open, activeStory?.id, activeStory?.media_url]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ah-story-viewer-visibility", { detail: { open: canOpen } }));
    return () => {
      window.dispatchEvent(new CustomEvent("ah-story-viewer-visibility", { detail: { open: false } }));
    };
  }, [canOpen]);

  if (!canOpen) return null;

  return (
    <div
      data-ah-suppress-window-pull-refresh=""
      className="fixed inset-0 z-[10160] flex flex-col bg-black text-white"
      onTouchStart={(e) => {
        touchStartY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartY.current;
        const end = e.changedTouches[0]?.clientY ?? null;
        touchStartY.current = null;
        if (start === null || end === null) return;
        if (end - start > 90) close();
      }}
    >
      {/* Top: progress + identity (Instagram-style story chrome) */}
      <header
        className="relative z-30 shrink-0 px-3 pt-[calc(env(safe-area-inset-top,0px)+6px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          {stories.map((story, i) => (
            <div key={story.id} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/18">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
                  i < storyIndex ? "bg-white" : i === storyIndex ? "bg-accent-violet-active shadow-[0_0_10px_rgba(91,130,255,0.45)]" : "bg-transparent"
                }`}
                style={{
                  width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!group) return;
              if (currentUserId && group.user_id === currentUserId) {
                router.push("/profile");
                return;
              }
              if (group.username) {
                router.push(`/u/${encodeURIComponent(group.username)}`);
                return;
              }
              router.push(`/profile/${group.user_id}`);
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 text-left transition active:opacity-90"
          >
            <Avatar src={group?.avatar_url ?? null} fallbackText={group?.username ?? "user"} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold leading-tight text-white">
                {group?.username ?? "user"}
              </div>
              <div className="truncate text-[12px] text-white/48">
                {relativeTime(activeStory.created_at)}
                {activeIsShare ? (
                  <span className="text-white/65"> · Share</span>
                ) : (
                  <span className="text-white/65"> · Moment</span>
                )}
              </div>
            </div>
          </button>

          {isStoryOwner ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="ah-glass-control ah-glass-control-interactive grid h-10 w-10 place-items-center rounded-full text-white"
                aria-label="Options"
              >
                <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-40 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-white/[0.12] bg-[#0d0f16]/98 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.65)] backdrop-blur-md">
                  <button
                    type="button"
                    onClick={deleteStory}
                    className="block w-full px-4 py-2.5 text-left text-[13px] font-medium text-red-300 hover:bg-red-500/12"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={close}
            className="ah-glass-control ah-glass-control-interactive grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </header>

      {/* Media — full bleed like IG; tap sides to advance */}
      <div className="relative min-h-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeStory.media_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={close}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" aria-hidden />
        <button
          type="button"
          className="absolute bottom-36 left-0 top-28 z-[5] w-[30%] max-w-[140px]"
          onClick={prevStory}
          aria-label="Previous"
        />
        <button
          type="button"
          className="absolute bottom-36 right-0 top-28 z-[5] w-[30%] max-w-[140px]"
          onClick={nextStory}
          aria-label="Next"
        />
      </div>

      {/* Bottom actions */}
      <footer
        className="relative z-30 shrink-0 border-t border-white/[0.08] bg-gradient-to-t from-black via-black/92 to-black/75 px-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+12px))] pt-3 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLike}
              className="flex items-center gap-2 rounded-full py-2 pl-1 pr-2 text-left transition active:scale-[0.98]"
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart
                size={28}
                strokeWidth={1.75}
                className={liked ? "fill-red-500 text-red-500" : "text-white"}
                aria-hidden
              />
              <span className="text-[14px] font-semibold tabular-nums text-white/90">{likesCount}</span>
            </button>
          </div>
          {activeIsShare ? (
            <button
              type="button"
              onClick={() => {
                if (!activeStory) return;
                openShareCommentsSheet(activeStory.id);
              }}
              className="flex items-center gap-1.5 rounded-full py-2 pl-1 pr-2 text-white transition active:scale-[0.98]"
              aria-label="Open comments"
            >
              <MessageCircle size={26} strokeWidth={1.75} aria-hidden />
              {comments.length > 0 ? (
                <span className="text-[13px] font-semibold tabular-nums text-white/90">{comments.length}</span>
              ) : null}
            </button>
          ) : null}
        </div>

        {activeIsShare && likedByLine ? (
          <p className="mx-auto mt-2 max-w-lg px-1 text-[12px] leading-snug text-white/55">{likedByLine}</p>
        ) : null}

        {activeIsShare ? (
          <div className="mx-auto mt-3 max-w-lg space-y-2">
            <div className="scrollbar-none max-h-[28vh] space-y-2 overflow-y-auto rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 py-1 text-[13px]">
                  <Avatar
                    src={(c.avatar_url ?? "").trim() || null}
                    fallbackText={c.username ?? "u"}
                    size="xs"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1 leading-snug">
                    <span className="font-semibold text-white">{c.username ?? "user"}</span>
                    <span className="text-white/55"> </span>
                    <span className="text-white/88">{c.content}</span>
                  </div>
                </div>
              ))}
              {!loadingMeta && comments.length === 0 ? (
                <div className="py-2 text-center text-[12px] text-white/40">No comments yet</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </footer>
    </div>
  );
}

