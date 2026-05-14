"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Heart, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";
import ProtectedRoute from "@/components/ProtectedRoute";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";
import MomentDetailSkeleton from "@/components/skeletons/MomentDetailSkeleton";
import { formatRelativeTime } from "@/lib/time";
import { createNotification } from "@/lib/notifications";
import { fetchProfilesForStoryCommenters } from "@/lib/storyCommentProfiles";
import { recordStoryView } from "@/lib/storyViews";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
} from "@/lib/appShellLayout";

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
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const archiveView = searchParams.get("view") === "archive";
  const [moment, setMoment] = useState<MomentRow | null>(null);
  const [owner, setOwner] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [momentHydrated, setMomentHydrated] = useState(false);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMoment(null);
    setOwner(null);
    setMomentHydrated(false);

    let cancelled = false;
    (async () => {
      try {
        if (!id) {
          if (!cancelled) setMomentHydrated(true);
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setMeId(user?.id ?? null);
        if (user?.id) {
          const { data: mp } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (!cancelled) {
            setMyProfile({
              username: mp?.username ?? null,
              avatar_url: (mp?.avatar_url ?? "").trim() || null,
            });
          }
        } else if (!cancelled) {
          setMyProfile(null);
        }

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

        if (user?.id) {
          void recordStoryView(supabase, user.id, m.id);
        }

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
          avatar_url: (ownerRow?.avatar_url ?? "").trim() || null,
        });
        setLikesCount(likesRes.count ?? 0);
        setLiked(!!likedRes.data);

        const commentRows = (commentsRes.data ?? []) as Array<{ id: string; user_id: string; content: string }>;
        const ids = Array.from(new Set(commentRows.map((c) => c.user_id)));
        const profileById =
          !archiveView && m.is_share && ids.length
            ? await fetchProfilesForStoryCommenters(supabase, m.id, ids)
            : {};

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

  useLayoutEffect(() => {
    if (!momentHydrated || !moment?.is_share || archiveView) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#comments") return;
    const t = window.setTimeout(() => {
      commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [momentHydrated, moment?.id, moment?.is_share, archiveView]);

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
      if (moment.is_share) {
        window.dispatchEvent(
          new CustomEvent("ah-share-likes-updated", {
            detail: { storyId: moment.id, deltaLikes: -1, likedByViewer: false },
          })
        );
      }
      return;
    }
    const { error } = await supabase.from("story_likes").insert({ story_id: moment.id, user_id: meId });
    if (error) return;
    setLiked(true);
    setLikesCount((v) => v + 1);
    if (moment.is_share) {
      window.dispatchEvent(
        new CustomEvent("ah-share-likes-updated", {
          detail: { storyId: moment.id, deltaLikes: 1, likedByViewer: true },
        })
      );
    }
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

  const deleteComment = async (comment: ViewerComment) => {
    if (!moment || !meId || !moment.is_share || archiveView) return;
    const canDelete = comment.user_id === meId || moment.user_id === meId;
    if (!canDelete) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment? This can’t be undone."
    );
    if (!confirmed) return;
    const { error } = await supabase.from("story_comments").delete().eq("id", comment.id);
    if (error) {
      alert("Could not delete comment.");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    window.dispatchEvent(
      new CustomEvent("ah-share-threads-updated", { detail: { storyId: moment.id, deltaComments: -1 } })
    );
  };

  const sendComment = async () => {
    if (!moment || !meId || !moment.is_share) return;
    const text = commentText.trim();
    if (!text) return;
    const { data: inserted, error } = await supabase
      .from("story_comments")
      .insert({
        story_id: moment.id,
        user_id: meId,
        content: text,
      })
      .select("id")
      .single();
    if (error || !inserted?.id) return;
    setComments((prev) => [
      ...prev,
      {
        id: inserted.id as string,
        user_id: meId,
        content: text,
        username: myProfile?.username ?? "you",
        avatar_url: myProfile?.avatar_url ?? null,
      },
    ]);
    setCommentText("");
    window.dispatchEvent(
      new CustomEvent("ah-share-threads-updated", { detail: { storyId: moment.id, deltaComments: 1 } })
    );
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
    const confirmed = window.confirm(
      moment.is_share
        ? "Delete this share? This can’t be undone."
        : "Delete this moment? This can’t be undone."
    );
    if (!confirmed) return;
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", moment.id)
      .eq("user_id", meId);
    if (error) return;
    window.dispatchEvent(new Event("story-posted"));
    navigateBack(router, "/hub");
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

  const goMomentBack = () => navigateBack(router, "/hub");

  return (
    <ProtectedRoute>
      <div className={`min-h-[100dvh] bg-primary text-white ${APP_CONTENT_MAX_CLASS}`}>
        {!momentHydrated ? (
          <MomentDetailSkeleton />
        ) : !moment ? (
          <>
            <div className="flex items-center border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
              <SubpageBackButton onBack={goMomentBack} />
            </div>
            <div className="grid h-[70vh] place-items-center px-4 text-center text-sm text-white/60">
              This Moment isn&apos;t available or was removed.
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
              <SubpageBackButton onBack={goMomentBack} />
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
                className="min-w-0 flex-1 px-3 text-center"
              >
                <span className="block truncate text-[14px] font-semibold text-white">
                  {owner?.username ?? "user"}
                </span>
                <span className="block truncate text-[12px] text-white/45">
                  {relativeTime}
                  {archiveView && moment?.created_at ? (
                    <span className="text-white/35">
                      {" "}
                      ·{" "}
                      {new Date(moment.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : null}
                </span>
              </button>
              {moment && meId && moment.user_id === meId ? (
                <div className="relative z-[100]">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="ah-glass-control ah-glass-control-interactive grid h-10 w-10 place-items-center rounded-full text-white"
                    aria-label="Moment options"
                  >
                    <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 top-full z-[110] mt-1.5 min-w-[12.5rem] overflow-hidden rounded-xl border border-white/[0.12] bg-[#101015]/98 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-md">
                      {moment?.is_share ? (
                        <>
                          <button
                            type="button"
                            onClick={toggleShareVisibility}
                            className="block w-full px-3 py-2.5 text-left text-[13px] text-white/90 hover:bg-white/[0.06]"
                          >
                            {moment.share_visible ? "Hide from others" : "Show to others"}
                          </button>
                          <button
                            type="button"
                            onClick={toggleHideShare}
                            className="block w-full px-3 py-2.5 text-left text-[13px] text-white/90 hover:bg-white/[0.06]"
                          >
                            {moment.share_hidden ? "Unhide from grid" : "Hide from grid"}
                          </button>
                          <div className="my-1 h-px bg-white/[0.08]" />
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={deleteMoment}
                        className="block w-full px-3 py-2.5 text-left text-[13px] text-red-300 hover:bg-red-500/15"
                      >
                        {moment.is_share ? "Delete share" : "Delete moment"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="h-10 w-10 shrink-0" aria-hidden />
              )}
            </div>

            <div className="ah-content-reveal">
              <div className="p-3 sm:p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={moment.media_url}
                  alt=""
                  className="aspect-[4/5] max-h-[min(78dvh,640px)] w-full rounded-[1.25rem] border border-white/[0.08] object-cover shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
                />
              </div>

              <div className={`space-y-3 px-4 ${APP_PAGE_TAIL_PADDING_CLASS}`}>
                <button
                  type="button"
                  onClick={toggleLike}
                  className="flex items-center gap-2 rounded-full py-1.5 text-left transition active:scale-[0.98]"
                >
                  <Heart
                    size={26}
                    strokeWidth={1.75}
                    className={liked ? "fill-red-500 text-red-500" : "text-white/90"}
                    aria-hidden
                  />
                  <span className="text-[15px] font-semibold tabular-nums text-white/90">{likesCount}</span>
                </button>
                {!archiveView && moment.is_share ? (
                  <div
                    id="share-comments"
                    ref={commentsSectionRef}
                    className="scroll-mt-6 space-y-3"
                  >
                    <div className="scrollbar-none max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-white/[0.03] px-3 py-2.5">
                      {comments.length ? (
                        comments.map((c) => {
                          const canDelete =
                            !!meId && (c.user_id === meId || moment.user_id === meId);
                          return (
                            <div key={c.id} className="flex items-start gap-2 text-xs text-white/85">
                              <Avatar
                                src={(c.avatar_url ?? "").trim() || null}
                                fallbackText={c.username ?? "u"}
                                size="xs"
                                className="shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold">{c.username ?? "user"}</p>
                                <p className="break-words">{c.content}</p>
                              </div>
                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => void deleteComment(c)}
                                  className="shrink-0 self-start pt-0.5 text-[11px] font-medium text-white/45 hover:text-red-300"
                                  aria-label={
                                    c.user_id === meId ? "Delete your comment" : "Remove comment from your share"
                                  }
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-white/50">No comments yet</div>
                      )}
                    </div>

                    <div className="ah-glass-control flex items-center gap-2 rounded-full px-1 py-1 pl-3">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment…"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] text-white outline-none placeholder:text-white/35"
                      />
                      <button
                        type="button"
                        onClick={sendComment}
                        className="shrink-0 rounded-full bg-accent-violet px-4 py-2.5 text-[13px] font-semibold text-white"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
