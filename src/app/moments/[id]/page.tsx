"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";
import ProtectedRoute from "@/components/ProtectedRoute";
import MomentDetailSkeleton from "@/components/skeletons/MomentDetailSkeleton";
import { formatRelativeTime } from "@/lib/time";
import { createNotification } from "@/lib/notifications";

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
  is_share?: boolean;
  share_visible?: boolean;
  share_hidden?: boolean;
};

export default function MomentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const archiveView = searchParams.get("view") === "archive";
  const [moment, setMoment] = useState<MomentRow | null>(null);
  const [owner, setOwner] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [momentHydrated, setMomentHydrated] = useState(false);

  useEffect(() => {
    setMoment(null);
    setOwner(null);
    setMomentHydrated(false);

    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setMeId(user?.id ?? null);

        const preferredMoment = await supabase
          .from("stories")
          .select("id, user_id, image_url, created_at, is_share, share_visible, share_hidden")
          .eq("id", id)
          .maybeSingle();
        const fallbackMoment = preferredMoment.error
          ? await supabase
              .from("stories")
              .select("id, user_id, image_url, created_at")
              .eq("id", id)
              .maybeSingle()
          : null;
        const m = (preferredMoment.data ??
          (fallbackMoment?.data
            ? {
                ...fallbackMoment.data,
                is_share: false,
                share_visible: false,
                share_hidden: false,
              }
            : null)) as any;
        if (!m) return;
        setMoment({
          id: m.id,
          user_id: m.user_id,
          media_url: m.image_url,
          created_at: m.created_at,
          is_share: !!m.is_share,
          share_visible: !!m.share_visible,
          share_hidden: !!m.share_hidden,
        });

        const [{ data: ownerRow }, likesRes, likedRes, commentsRes] = await Promise.all([
          supabase.from("profiles").select("username, avatar_url").eq("id", m.user_id).maybeSingle(),
          supabase.from("story_likes").select("id", { count: "exact", head: true }).eq("story_id", m.id),
          user?.id
            ? supabase.from("story_likes").select("id").eq("story_id", m.id).eq("user_id", user.id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          archiveView || !m.is_share
            ? Promise.resolve({ data: [] } as any)
            : supabase.from("story_comments").select("id, user_id, content").eq("story_id", m.id).order("created_at", { ascending: true }),
        ]);

        if (cancelled) return;

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
      } finally {
        if (!cancelled) setMomentHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, archiveView]);

  const relativeTime = useMemo(() => {
    if (!moment?.created_at) return "";
    return formatRelativeTime(moment.created_at);
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
    if (moment.user_id !== meId) {
      await createNotification({
        recipientId: moment.user_id,
        actorId: meId,
        type: "story_like",
        storyId: moment.id,
        dedupeKey: `story_like:${moment.id}:${meId}`,
        pushTitle: "Your post got a new like",
        pushBody: "A friend liked your post.",
        route: `/moments/${moment.id}`,
      });
    }
  };

  const sendComment = async () => {
    if (!moment || !meId || !moment.is_share) return;
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
    if (moment.user_id !== meId) {
      await createNotification({
        recipientId: moment.user_id,
        actorId: meId,
        type: "story_comment",
        storyId: moment.id,
        messagePreview: text.slice(0, 140),
        pushTitle: "New comment on your post",
        pushBody: text.slice(0, 120),
        route: `/moments/${moment.id}`,
      });
    }
  };

  const deleteMoment = async () => {
    if (!moment || !meId || moment.user_id !== meId) return;
    const confirmed = window.confirm("Delete this Moment? This can’t be undone.");
    if (!confirmed) return;
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", moment.id)
      .eq("user_id", meId);
    if (error) return;
    window.dispatchEvent(new Event("story-posted"));
    router.back();
  };

  const toggleShareVisibility = async () => {
    if (!moment || !meId || moment.user_id !== meId || !moment.is_share) return;
    const next = !moment.share_visible;
    const { error } = await supabase
      .from("stories")
      .update({ share_visible: next })
      .eq("id", moment.id)
      .eq("user_id", meId);
    if (error) {
      alert("Could not update share visibility.");
      return;
    }
    setMoment((prev) => (prev ? { ...prev, share_visible: next } : prev));
    window.dispatchEvent(new Event("story-posted"));
    setMenuOpen(false);
  };

  const toggleHideShare = async () => {
    if (!moment || !meId || moment.user_id !== meId || !moment.is_share) return;
    const next = !moment.share_hidden;
    const { error } = await supabase
      .from("stories")
      .update({ share_hidden: next })
      .eq("id", moment.id)
      .eq("user_id", meId);
    if (error) {
      alert("Could not update hidden status.");
      return;
    }
    setMoment((prev) => (prev ? { ...prev, share_hidden: next } : prev));
    window.dispatchEvent(new Event("story-posted"));
    setMenuOpen(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] bg-black text-white">
        {!momentHydrated ? (
          <MomentDetailSkeleton />
        ) : !moment ? (
          <>
            <div className="flex items-center border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
              <button type="button" onClick={() => router.back()} className="text-sm text-white/80">
                ← Back
              </button>
            </div>
            <div className="grid h-[70vh] place-items-center px-4 text-center text-sm text-white/60">
              This Moment isn&apos;t available or was removed.
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
              <button type="button" onClick={() => router.back()} className="text-sm text-white/80">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!moment) return;
                  if (meId && moment.user_id === meId) {
                    router.push("/profile");
                    return;
                  }
                  if (owner?.username) {
                    router.push(`/u/${encodeURIComponent(owner.username)}`);
                    return;
                  }
                  router.push(`/profile/${moment.user_id}`);
                }}
                className="text-xs text-white/70"
              >
                {(owner?.username ?? "user") + " · " + relativeTime}
                {archiveView && moment?.created_at ? (
                  <span className="ml-1 text-white/55">
                    · {new Date(moment.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                ) : null}
              </button>
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
                    <div className="absolute right-0 mt-1 overflow-hidden rounded-md border border-white/15 bg-black/95">
                      {moment?.is_share ? (
                        <>
                          <button
                            type="button"
                            onClick={toggleShareVisibility}
                            className="block w-full whitespace-nowrap px-2.5 py-1.5 text-left text-xs text-white/90 hover:bg-white/10"
                          >
                            {moment.share_visible ? "Hide from others" : "Show to others"}
                          </button>
                          <button
                            type="button"
                            onClick={toggleHideShare}
                            className="block w-full whitespace-nowrap px-2.5 py-1.5 text-left text-xs text-white/90 hover:bg-white/10"
                          >
                            {moment.share_hidden ? "Unhide share" : "Hide share"}
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={deleteMoment}
                        className="block w-full whitespace-nowrap px-2.5 py-1.5 text-left text-xs text-red-300 hover:bg-red-500/20"
                      >
                        Delete Moment
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="w-12" />
              )}
            </div>

            <div className="ah-content-reveal">
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
                {!archiveView && moment.is_share ? (
                  <>
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
                  </>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
