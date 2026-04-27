"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";
import ProtectedRoute from "@/components/ProtectedRoute";

type ViewerComment = {
  id: string;
  user_id: string;
  content: string;
  username: string | null;
  avatar_url: string | null;
};

type MomentRow = {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
};

export default function MomentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [moment, setMoment] = useState<MomentRow | null>(null);
  const [owner, setOwner] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMeId(user?.id ?? null);

      const { data: m } = await supabase
        .from("stories")
        .select("id, user_id, image_url, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!m) return;
      setMoment({
        id: m.id,
        user_id: m.user_id,
        media_url: m.image_url,
        created_at: m.created_at,
      });

      const [{ data: ownerRow }, likesRes, likedRes, commentsRes] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url").eq("id", m.user_id).maybeSingle(),
        supabase.from("story_likes").select("id", { count: "exact", head: true }).eq("story_id", m.id),
        user?.id
          ? supabase.from("story_likes").select("id").eq("story_id", m.id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase.from("story_comments").select("id, user_id, content").eq("story_id", m.id).order("created_at", { ascending: true }),
      ]);

      setOwner({
        username: ownerRow?.username ?? null,
        avatar_url: ownerRow?.avatar_url ?? null,
      });
      setLikesCount(likesRes.count ?? 0);
      setLiked(!!likedRes.data);

      const commentRows = (commentsRes.data ?? []) as Array<{ id: string; user_id: string; content: string }>;
      const ids = Array.from(new Set(commentRows.map((c) => c.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
        : { data: [] as any[] };
      const profileById: Record<string, { username: string | null; avatar_url: string | null }> = {};
      (profiles ?? []).forEach((p: any) => {
        profileById[p.id] = {
          username: p.username ?? null,
          avatar_url: p.avatar_url ?? null,
        };
      });

      setComments(
        commentRows.map((c) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          username: profileById[c.user_id]?.username ?? null,
          avatar_url: profileById[c.user_id]?.avatar_url ?? null,
        }))
      );
    })();
  }, [id]);

  const relativeTime = useMemo(() => {
    if (!moment?.created_at) return "";
    const ms = Date.now() - new Date(moment.created_at).getTime();
    const mins = Math.max(0, Math.floor(ms / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  }, [moment?.created_at]);

  const toggleLike = async () => {
    if (!moment || !meId) return;
    if (liked) {
      const { error } = await supabase.from("story_likes").delete().eq("story_id", moment.id).eq("user_id", meId);
      if (error) return;
      setLiked(false);
      setLikesCount((v) => Math.max(0, v - 1));
      return;
    }
    const { error } = await supabase.from("story_likes").insert({ story_id: moment.id, user_id: meId });
    if (error) return;
    setLiked(true);
    setLikesCount((v) => v + 1);
  };

  const sendComment = async () => {
    if (!moment || !meId) return;
    const text = commentText.trim();
    if (!text) return;
    const { error } = await supabase.from("story_comments").insert({
      story_id: moment.id,
      user_id: meId,
      content: text,
    });
    if (error) return;
    setComments((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        user_id: meId,
        content: text,
        username: "you",
        avatar_url: null,
      },
    ]);
    setCommentText("");
  };

  const deleteMoment = async () => {
    if (!moment || !meId || moment.user_id !== meId) return;
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", moment.id)
      .eq("user_id", meId);
    if (error) return;
    window.dispatchEvent(new Event("story-posted"));
    router.back();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button type="button" onClick={() => router.back()} className="text-sm text-white/80">
            ← Back
          </button>
          <div className="text-xs text-white/70">
            {(owner?.username ?? "user") + " · " + relativeTime}
          </div>
          {moment && meId && moment.user_id === meId ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-md bg-white/10 px-2 py-1 text-xs text-white"
                aria-label="Moment options"
              >
                •••
              </button>
              {menuOpen ? (
                <button
                  type="button"
                  onClick={deleteMoment}
                  className="absolute right-0 mt-1 rounded-md border border-red-500/30 bg-black px-2 py-1 text-xs text-red-300"
                >
                  Delete Moment
                </button>
              ) : null}
            </div>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {moment ? (
          <>
            <div className="p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={moment.media_url}
                alt="Moment"
                className="h-[56vh] w-full rounded-2xl border border-white/10 object-cover"
              />
            </div>

            <div className="space-y-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
              <button
                type="button"
                onClick={toggleLike}
                className={`text-sm ${liked ? "text-red-400" : "text-white/90"}`}
              >
                {liked ? "♥" : "♡"} {likesCount}
              </button>

              <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {comments.length ? (
                  comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 text-xs text-white/85">
                      <Avatar src={c.avatar_url} fallbackText={c.username ?? "u"} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{c.username ?? "user"}</p>
                        <p className="break-words">{c.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-white/50">No comments yet</div>
                )}
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
          </>
        ) : (
          <div className="grid h-[70vh] place-items-center text-sm text-white/60">Loading Moment…</div>
        )}
      </div>
    </ProtectedRoute>
  );
}
