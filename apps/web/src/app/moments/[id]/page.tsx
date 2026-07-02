"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";
import ProtectedRoute from "@/components/ProtectedRoute";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";
import MomentDetailSkeleton from "@/components/skeletons/MomentDetailSkeleton";
import { formatRelativeTime } from "@/lib/time";
import { createNotification } from "@/lib/notifications";
import { fetchProfilesForStoryCommenters } from "@/lib/storyCommentProfiles";
import { recordStoryView } from "@/lib/storyViews";
import { viewerCanSeeOwnerPosts } from "@/lib/pairBlockStatus";
import { BLOCK_OR_PRIVATE_COPY } from "@/lib/blockAndPrivateCopy";
import { fetchLikedByFriendsLineForStory } from "@/lib/storyFeedInteractions";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
} from "@/lib/appShellLayout";
import { openShareCommentsSheet } from "@/lib/shareCommentsSheet";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [momentHydrated, setMomentHydrated] = useState(false);
  const [likedByLine, setLikedByLine] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    if (window.location.hash !== "#comments") return;
    openShareCommentsSheet(id);
    const path = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", path);
  }, [id]);

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

        const viewerId = user?.id ?? null;
        const ownerId = m.user_id as string;
        const isShare = !!m.is_share;
        const shareVisible = !!m.share_visible;

        if (archiveView && viewerId !== ownerId) {
          if (!cancelled) {
            setMoment(null);
            setOwner(null);
          }
          return;
        }

        const canSeeOwner = await viewerCanSeeOwnerPosts(supabase, viewerId, ownerId);
        if (!canSeeOwner) {
          if (!cancelled) {
            setMoment(null);
            setOwner(null);
          }
          return;
        }

        const shareHidden = !!m.share_hidden;
        if (
          isShare &&
          !archiveView &&
          viewerId !== ownerId &&
          (shareHidden || !shareVisible)
        ) {
          if (!cancelled) {
            setMoment(null);
            setOwner(null);
          }
          return;
        }

        setMoment({
          id: m.id,
          user_id: ownerId,
          media_url: m.image_url,
          created_at: m.created_at,
          is_share: isShare,
          share_visible: shareVisible,
          share_hidden: shareHidden,
        });

        if (user?.id && user.id !== ownerId) {
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

  useEffect(() => {
    if (!moment?.is_share || !meId) {
      setLikedByLine(null);
      return;
    }
    let cancelled = false;
    void fetchLikedByFriendsLineForStory(supabase, moment.id, meId).then((line) => {
      if (!cancelled) setLikedByLine(line);
    });
    return () => {
      cancelled = true;
    };
  }, [moment?.id, moment?.is_share, meId]);

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
      if (moment.is_share) {
        const line = await fetchLikedByFriendsLineForStory(supabase, moment.id, meId);
        setLikedByLine(line);
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
        pushTitle: moment.is_share ? "Your share got a new like" : "Your moment got a new like",
        pushBody: moment.is_share ? "A friend liked your share." : "A friend liked your moment.",
        route: `/moments/${moment.id}`,
      });
    }
    if (moment.is_share) {
      const line = await fetchLikedByFriendsLineForStory(supabase, moment.id, meId);
      setLikedByLine(line);
    }
  };

  const openCommentsPage = () => {
    if (!id) return;
    openShareCommentsSheet(id);
  };

  const deleteMoment = async () => {
    if (!moment || !meId || moment.user_id !== meId) return;
    const confirmed = window.confirm(
      moment.is_share
        ? "Delete this share? This can’t be undone."
        : "Delete this moment? This can’t be undone."
    );
    if (!confirmed) return;
    setMenuOpen(false);
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", moment.id)
      .eq("user_id", meId);
    if (error) {
      console.error("stories delete:", error);
      alert(error.message ? `Could not delete: ${error.message}` : "Could not delete. Try again.");
      return;
    }
    window.dispatchEvent(new Event("story-posted"));
    navigateBack(router, "/hub");
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
              <p className="text-[15px] font-semibold text-white/88">{BLOCK_OR_PRIVATE_COPY.postUnavailableTitle}</p>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/48">
                {BLOCK_OR_PRIVATE_COPY.postUnavailableBody}
              </p>
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
                            onClick={() => void toggleHideShare()}
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
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
                  </div>
                  {!archiveView && moment.is_share ? (
                    <button
                      type="button"
                      onClick={openCommentsPage}
                      className="flex items-center gap-1.5 rounded-full py-1.5 pl-1 pr-2 text-white/90 transition active:scale-[0.98]"
                      aria-label="Open comments"
                    >
                      <MessageCircle size={26} strokeWidth={1.75} aria-hidden />
                      {comments.length > 0 ? (
                        <span className="text-[14px] font-semibold tabular-nums">{comments.length}</span>
                      ) : null}
                    </button>
                  ) : null}
                </div>
                {!archiveView && moment.is_share && likedByLine ? (
                  <p className="text-[12px] leading-snug text-white/55">{likedByLine}</p>
                ) : null}
                {!archiveView && moment.is_share ? (
                  <div className="space-y-2">
                    <div className="scrollbar-none max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-white/[0.03] px-3 py-2.5">
                      {comments.length ? (
                        comments.map((c) => (
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
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-white/50">No comments yet</div>
                      )}
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
