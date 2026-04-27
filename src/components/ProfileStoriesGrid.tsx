"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";

type StoryRow = {
  id: string;
  user_id: string;
  image_url: string;
  media_url: string;
  created_at: string;
  expires_at: string | null;
};

export default function ProfileStoriesGrid({
  userId,
  emptyLabel = "No stories yet",
}: {
  userId: string | null;
  emptyLabel?: string;
}) {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<StoryRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileInfo, setProfileInfo] = useState<{ username: string | null; avatar_url: string | null }>({
    username: null,
    avatar_url: null,
  });
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<
    Array<{
      id: string;
      user_id: string;
      content: string;
      created_at: string | null;
      username: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!userId) {
      setStories([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadStories = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) setCurrentUserId(user?.id ?? null);

      const { data: prof } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (mounted) {
        setProfileInfo({
          username: prof?.username ?? null,
          avatar_url: prof?.avatar_url ?? null,
        });
      }

      const { data, error } = await supabase
        .from("stories")
        .select("id, user_id, image_url, created_at, expires_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("profile stories fetch error:", error);
        if (!mounted) return;
        setStories([]);
        setLoading(false);
        return;
      }

      if (!mounted) return;
      const rows = ((data ?? []) as any[])
        .map((s) => ({
          id: s.id,
          user_id: s.user_id,
          image_url: s.image_url,
          media_url: s.image_url,
          created_at: s.created_at,
          expires_at: s.expires_at ?? null,
        }))
        .filter((s) => !!s.media_url) as StoryRow[];
      setStories(rows);
      setLoading(false);
    };

    loadStories();
    const onStoryPosted = () => loadStories();
    window.addEventListener("story-posted", onStoryPosted);

    return () => {
      mounted = false;
      window.removeEventListener("story-posted", onStoryPosted);
    };
  }, [userId]);

  if (loading) {
    return <div className="text-white/50 text-sm text-center mt-8">Loading stories…</div>;
  }

  if (stories.length === 0) {
    return <div className="text-white/40 text-sm text-center mt-8">{emptyLabel}</div>;
  }

  const isStoryOwner = !!currentUserId && !!selectedStory && currentUserId === selectedStory.user_id;
  const relativeTime = (createdAt: string) => {
    const ms = Date.now() - new Date(createdAt).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "just now";
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };
  const openStoryDetails = async (story: StoryRow) => {
    setSelectedStory(story);
    setCommentText("");
    setMenuOpen(false);

    const [{ count, error: likesCountError }, likedRes, commentsRes] = await Promise.all([
      supabase
        .from("story_likes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", story.id),
      currentUserId
        ? supabase
            .from("story_likes")
            .select("id")
            .eq("story_id", story.id)
            .eq("user_id", currentUserId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase
        .from("story_comments")
        .select("id, user_id, content")
        .eq("story_id", story.id)
        .order("created_at", { ascending: true }),
    ]);
    if (likesCountError) console.error(likesCountError);
    if (likedRes?.error) console.error(likedRes.error);
    if (commentsRes?.error) console.error(commentsRes.error);

    setLikesCount(count ?? 0);
    setLiked(!!likedRes.data);

    const rows = (commentsRes.data ?? []) as Array<{ id: string; user_id: string; content: string; created_at?: string }>;
    const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    let profileById: Record<string, { username: string | null; avatar_url: string | null }> = {};
    if (ids.length) {
      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);
      (profRows ?? []).forEach((p: any) => {
        profileById[p.id] = { username: p.username ?? null, avatar_url: p.avatar_url ?? null };
      });
    }
    setComments(
      rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        created_at: r.created_at ?? null,
        username: profileById[r.user_id]?.username ?? null,
        avatar_url: profileById[r.user_id]?.avatar_url ?? null,
      }))
    );
  };

  const toggleLike = async () => {
    if (!selectedStory || !currentUserId) return;
    if (liked) {
      const { data, error } = await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", selectedStory.id)
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
    const { data, error } = await supabase.from("story_likes").insert({
      story_id: selectedStory.id,
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

  const sendComment = async () => {
    if (!selectedStory || !currentUserId) return;
    const text = commentText.trim();
    if (!text) return;
    const { data, error } = await supabase
      .from("story_comments")
      .insert({
        story_id: selectedStory.id,
        user_id: currentUserId,
        content: text,
      })
      .select("id, user_id, content, created_at")
      .single();
    if (error || !data) {
      if (error) console.error(error);
      alert("Action failed");
      return;
    }
    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at ?? null,
        username: currentUserId === selectedStory.user_id ? profileInfo.username : "you",
        avatar_url: currentUserId === selectedStory.user_id ? profileInfo.avatar_url : null,
      },
    ]);
    setCommentText("");
  };

  const deleteComment = async (commentId: string) => {
    if (!selectedStory || !currentUserId) return;
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    const canDelete = comment.user_id === currentUserId || selectedStory.user_id === currentUserId;
    if (!canDelete) return;
    const { error } = await supabase.from("story_comments").delete().eq("id", commentId);
    if (error) {
      console.error(error);
      alert("Action failed");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const deleteStory = async () => {
    if (!selectedStory || !currentUserId || selectedStory.user_id !== currentUserId) return;
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", selectedStory.id)
      .eq("user_id", currentUserId);
    if (error) {
      console.error(error);
      alert("Action failed");
      return;
    }
    setStories((prev) => prev.filter((s) => s.id !== selectedStory.id));
    setMenuOpen(false);
    setSelectedStory(null);
    window.dispatchEvent(new Event("story-posted"));
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-[2px] mt-4">
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            className="w-full aspect-square bg-black"
            onClick={() => openStoryDetails(story)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={story.media_url} className="w-full h-full object-cover" alt="story" />
          </button>
        ))}
      </div>
      {selectedStory ? (
        <div className="fixed inset-0 z-[170] bg-black">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={() => setSelectedStory(null)}
              className="text-sm text-white/80"
            >
              ← Back
            </button>
            <div className="text-xs text-white/70">
              {(profileInfo.username ?? "user") + " · " + relativeTime(selectedStory.created_at)}
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
            ) : (
              <div className="w-16" />
            )}
          </div>
          <div className="flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedStory.media_url} alt="story" className="max-h-[58vh] max-w-[92vw] object-contain" />
          </div>
          <div className="space-y-2 px-4 pb-4">
            <button
              type="button"
              onClick={toggleLike}
              className={`text-sm ${liked ? "text-red-400" : "text-white/90"}`}
            >
              {liked ? "♥" : "♡"} {likesCount}
            </button>
            <div className="max-h-44 space-y-2 overflow-auto">
              {comments.map((c) => {
                const canDelete = !!currentUserId && (c.user_id === currentUserId || selectedStory.user_id === currentUserId);
                return (
                  <div key={c.id} className="flex items-start gap-2 text-xs text-white/85">
                    <Avatar src={c.avatar_url} fallbackText={c.username ?? "u"} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{c.username ?? "user"}</div>
                      <div className="break-words">{c.content}</div>
                    </div>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => deleteComment(c.id)}
                        className="text-[10px] text-white/50"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {comments.length === 0 ? (
                <div className="text-xs text-white/50">No comments yet</div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={sendComment}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

