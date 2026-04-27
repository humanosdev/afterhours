"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";

export type StoryViewerStory = {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  expires_at: string | null;
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

function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const [storyIndex, setStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [myProfile, setMyProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const touchStartY = useRef<number | null>(null);

  const stories = group?.stories ?? [];
  const activeStory = stories[storyIndex] ?? null;
  const isStoryOwner = !!currentUserId && !!activeStory && currentUserId === activeStory.user_id;

  useEffect(() => {
    if (!open) return;
    setStoryIndex(initialIndex);
    setProgress(0);
    setCommentText("");
    setMenuOpen(false);
  }, [open, initialIndex, group?.user_id]);

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
        avatar_url: data?.avatar_url ?? null,
      });
    })();
  }, [open, currentUserId]);

  const relativeTime = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    if (!Number.isFinite(diff) || diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
  };

  const close = () => {
    setMenuOpen(false);
    onClose();
  };

  const nextStory = () => {
    if (!activeStory) return close();
    if (storyIndex >= stories.length - 1) return close();
    setStoryIndex((s) => s + 1);
    setProgress(0);
  };

  const prevStory = () => {
    if (storyIndex <= 0) return;
    setStoryIndex((s) => Math.max(0, s - 1));
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
        supabase
          .from("story_comments")
          .select("id, story_id, user_id, content, created_at")
          .eq("story_id", activeStory.id)
          .order("created_at", { ascending: true }),
      ]);

      if (likesCountError) console.error(likesCountError);
      if (likedRes?.error) console.error(likedRes.error);
      if (commentsRes?.error) console.error(commentsRes.error);
      if (!mounted) return;

      setLikesCount(count ?? 0);
      setLiked(!!likedRes?.data);

      const commentRows = (commentsRes?.data ?? []) as any[];
      const ids = Array.from(new Set(commentRows.map((c) => c.user_id).filter(Boolean)));
      let profileById: Record<string, { username: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: prof, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", ids);
        if (profileError) console.error(profileError);
        (prof ?? []).forEach((p: any) => {
          profileById[p.id] = {
            username: p.username ?? null,
            avatar_url: p.avatar_url ?? null,
          };
        });
      }
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
      setLoadingMeta(false);
    };
    loadMeta();
    return () => {
      mounted = false;
    };
  }, [open, activeStory?.id, currentUserId]);

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
  };

  const submitComment = async () => {
    if (!activeStory || !currentUserId) return;
    const text = commentText.trim();
    if (!text) return;
    const { error } = await supabase
      .from("story_comments")
      .insert({
        story_id: activeStory.id,
        user_id: currentUserId,
        content: text,
      });
    if (error) {
      if (error) console.error(error);
      alert("Action failed");
      return;
    }
    const now = new Date().toISOString();
    setComments((prev) => [
      ...prev,
      {
        id: createTempId("comment"),
        story_id: activeStory.id,
        user_id: currentUserId,
        content: text,
        created_at: now,
        username: myProfile?.username ?? null,
        avatar_url: myProfile?.avatar_url ?? null,
      },
    ]);
    setCommentText("");
  };

  const deleteComment = async (comment: ViewerComment) => {
    if (!activeStory || !currentUserId) return;
    const canDelete =
      comment.user_id === currentUserId || activeStory.user_id === currentUserId;
    if (!canDelete) return;
    const { error } = await supabase.from("story_comments").delete().eq("id", comment.id);
    if (error) {
      console.error(error);
      alert("Action failed");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
  };

  const deleteStory = async () => {
    if (!activeStory || !currentUserId || activeStory.user_id !== currentUserId) return;
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", activeStory.id)
      .eq("user_id", currentUserId);
    if (error) {
      console.error(error);
      alert("Action failed");
      return;
    }
    onStoryDeleted?.(activeStory.id);
    window.dispatchEvent(new Event("story-posted"));
    close();
  };

  const canOpen = useMemo(() => {
    if (!open || !activeStory) return false;
    return !!activeStory.media_url;
  }, [open, activeStory?.id]);

  if (!canOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[160] bg-black/95"
      onClick={close}
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
      <div className="absolute left-0 right-0 top-0 z-10 px-3 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5">
          {stories.map((story, i) => (
            <div key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-white transition-[width] duration-100"
                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Avatar src={group?.avatar_url ?? null} fallbackText={group?.username ?? "user"} size="xs" />
            <div className="text-xs text-white/90">
              {(group?.username ?? "user") + " · " + relativeTime(activeStory.created_at)}
            </div>
          </div>
          {isStoryOwner ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-md bg-white/10 px-2 py-1 text-xs text-white"
                aria-label="Story options"
              >
                •••
              </button>
              {menuOpen ? (
                <button
                  type="button"
                  onClick={deleteStory}
                  className="absolute right-0 mt-1 rounded-md border border-red-500/30 bg-black px-2 py-1 text-xs text-red-300"
                >
                  Delete Story
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative h-full w-full" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeStory.media_url}
          alt="Story"
          className="absolute inset-0 m-auto max-h-[74vh] max-w-[92vw] object-contain"
          onError={close}
        />

        <button type="button" className="absolute left-0 top-0 h-full w-1/2" onClick={prevStory} aria-label="Previous story" />
        <button type="button" className="absolute right-0 top-0 h-full w-1/2" onClick={nextStory} aria-label="Next story" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-black/70 px-3 py-3">
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLike}
            className={`rounded-lg px-2 py-1 text-sm ${liked ? "text-red-400" : "text-white/90"}`}
          >
            {liked ? "♥" : "♡"} {likesCount}
          </button>
        </div>

        <div className="max-h-28 space-y-2 overflow-auto">
          {comments.map((c) => {
            const canDelete = !!currentUserId && (c.user_id === currentUserId || activeStory.user_id === currentUserId);
            return (
              <div key={c.id} className="flex items-start gap-2 text-xs text-white/90">
                <Avatar src={c.avatar_url} fallbackText={c.username ?? "u"} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.username ?? "user"}</div>
                  <div className="break-words text-white/80">{c.content}</div>
                </div>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => deleteComment(c)}
                    className="text-[10px] text-white/50"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            );
          })}
          {!loadingMeta && comments.length === 0 ? (
            <div className="text-xs text-white/50">No comments yet</div>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none"
          />
          <button
            type="button"
            onClick={submitComment}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

