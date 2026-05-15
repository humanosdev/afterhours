"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui";
import { createNotification } from "@/lib/notifications";
import { fetchProfilesForStoryCommenters } from "@/lib/storyCommentProfiles";
import { viewerCanSeeOwnerPosts } from "@/lib/pairBlockStatus";
import { BLOCK_OR_PRIVATE_COPY } from "@/lib/blockAndPrivateCopy";
import { isStoryRowShareFlag } from "@/lib/storyRowShare";

const QUICK_REACTIONS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

type ViewerComment = {
  id: string;
  user_id: string;
  content: string;
  username: string | null;
  avatar_url: string | null;
};

function InnerSheet({
  storyId,
  onFullyClosed,
}: {
  storyId: string;
  onFullyClosed: () => void;
}) {
  const [panelUp, setPanelUp] = useState(false);
  const [moment, setMoment] = useState<{
    id: string;
    user_id: string;
    is_share: boolean;
  } | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [backdropOn, setBackdropOn] = useState(false);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setBackdropOn(true);
      setPanelUp(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const closeOnceRef = useRef(false);

  const finishClose = () => {
    if (closeOnceRef.current) return;
    closeOnceRef.current = true;
    setBackdropOn(false);
    setPanelUp(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
        } else if (!cancelled) setMyProfile(null);

        const preferred = await supabase
          .from("stories")
          .select("id, user_id, is_share, share_visible, share_hidden")
          .eq("id", storyId)
          .maybeSingle();
        const m = preferred.data as {
          id: string;
          user_id: string;
          is_share?: boolean;
          share_visible?: boolean;
          share_hidden?: boolean;
        } | null;
        if (!m || !isStoryRowShareFlag(m.is_share)) {
          if (!cancelled) setMoment(null);
          return;
        }

        const viewerId = user?.id ?? null;
        const ownerId = m.user_id;
        const shareVisible = !!m.share_visible;
        const shareHidden = !!m.share_hidden;

        const canSeeOwner = await viewerCanSeeOwnerPosts(supabase, viewerId, ownerId);
        if (!canSeeOwner) {
          if (!cancelled) setMoment(null);
          return;
        }
        if (viewerId !== ownerId && (shareHidden || !shareVisible)) {
          if (!cancelled) setMoment(null);
          return;
        }

        if (!cancelled) {
          setMoment({ id: m.id, user_id: ownerId, is_share: true });
        }

        const { data: commentRows } = await supabase
          .from("story_comments")
          .select("id, user_id, content")
          .eq("story_id", storyId)
          .order("created_at", { ascending: true });
        const rows = (commentRows ?? []) as Array<{ id: string; user_id: string; content: string }>;
        const ids = Array.from(new Set(rows.map((c) => c.user_id)));
        const profileById =
          ids.length && storyId ? await fetchProfilesForStoryCommenters(supabase, storyId, ids) : {};
        if (!cancelled) {
          setComments(
            rows.map((c) => ({
              id: c.id,
              user_id: c.user_id,
              content: c.content,
              username: profileById[c.user_id]?.username ?? null,
              avatar_url: profileById[c.user_id]?.avatar_url ?? null,
            }))
          );
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const sendComment = async () => {
    if (!moment || !meId) return;
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
    if (error || !inserted?.id) {
      if (error) console.error(error);
      alert("Could not post comment.");
      return;
    }
    setComments((prev) => [
      ...prev,
      {
        id: inserted.id as string,
        user_id: meId,
        content: text,
        username: myProfile?.username ?? null,
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
        pushTitle: `${myProfile?.username ?? "A friend"} commented`,
        pushBody: text.slice(0, 120),
        route: `/moments/${moment.id}`,
      });
    }
  };

  const deleteComment = async (comment: ViewerComment) => {
    if (!moment || !meId) return;
    const canDelete = comment.user_id === meId || moment.user_id === meId;
    if (!canDelete) return;
    const confirmed = window.confirm("Delete this comment? This can’t be undone.");
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

  const appendEmoji = (emoji: string) => {
    setCommentText((t) => `${t}${emoji}`);
  };

  const onPanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "transform" || panelUp) return;
    onFullyClosed();
  };

  const startDismissFromDrag = (clientY: number) => {
    touchStartY.current = clientY;
  };

  const endDismissFromDrag = (clientY: number) => {
    const start = touchStartY.current;
    touchStartY.current = null;
    if (start === null) return;
    if (clientY - start > 72) finishClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10180] flex flex-col justify-end"
      data-ah-suppress-window-pull-refresh=""
      role="dialog"
      aria-modal="true"
      aria-label="Comments"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ${
          backdropOn ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close comments"
        onClick={() => finishClose()}
      />
      <div
        onTransitionEnd={onPanelTransitionEnd}
        className={`relative flex h-[min(80dvh,92dvh)] max-h-[min(92dvh,920px)] w-full min-h-0 flex-col rounded-t-[1.35rem] border border-white/[0.1] border-b-0 bg-[#0c0d12] shadow-[0_-20px_80px_rgba(0,0,0,0.75)] transition-transform duration-300 ease-out ${
          panelUp ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center pt-2 active:cursor-grabbing"
          onTouchStart={(e) => startDismissFromDrag(e.touches[0]?.clientY ?? 0)}
          onTouchEnd={(e) => endDismissFromDrag(e.changedTouches[0]?.clientY ?? 0)}
        >
          <div className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
        </div>
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-3 pb-2.5 pt-1">
          <div className="w-10" aria-hidden />
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[16px] font-bold tracking-tight text-white">Comments</p>
          </div>
          <button
            type="button"
            onClick={() => finishClose()}
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        {!hydrated ? (
          <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-4 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-full animate-pulse rounded bg-white/[0.07]" />
                  <div className="h-3 w-[80%] max-w-[220px] animate-pulse rounded bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : !moment ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-white/88">{BLOCK_OR_PRIVATE_COPY.postUnavailableTitle}</p>
            <p className="max-w-sm text-[13px] leading-relaxed text-white/48">{BLOCK_OR_PRIVATE_COPY.postUnavailableBody}</p>
            <button
              type="button"
              onClick={() => finishClose()}
              className="mt-4 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-black"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 py-3 [-webkit-overflow-scrolling:touch]">
              {comments.length ? (
                <div className="space-y-4 pb-2">
                  {comments.map((c) => {
                    const canDelete = !!meId && (c.user_id === meId || moment.user_id === meId);
                    return (
                      <div key={c.id} className="flex gap-3 text-[13px] leading-snug text-white/88">
                        <Avatar
                          src={(c.avatar_url ?? "").trim() || null}
                          fallbackText={c.username ?? "u"}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-white">{c.username ?? "user"}</span>
                          <span className="text-white/55"> </span>
                          <span className="break-words">{c.content}</span>
                        </div>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => void deleteComment(c)}
                            className="shrink-0 self-start text-[11px] font-medium text-white/38 hover:text-red-300"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-10 text-center text-[13px] text-white/45">No comments yet.</p>
              )}
            </div>

            <div className="shrink-0 border-t border-white/[0.08] bg-[#0c0d12]/98 px-3 pb-[max(0.5rem,calc(env(safe-area-inset-bottom,0px)+10px))] pt-2">
              <div className="scrollbar-none mb-2 flex gap-1 overflow-x-auto px-0.5">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => appendEmoji(emoji)}
                    className="grid h-10 min-w-[2.5rem] shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lg transition active:scale-95"
                    aria-label={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2.5">
                <Avatar
                  src={(myProfile?.avatar_url ?? "").trim() || null}
                  fallbackText={myProfile?.username ?? "me"}
                  size="sm"
                  className="shrink-0 self-end pb-1"
                />
                <div className="relative min-w-0 flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={meId ? "?dont hold back" : "Sign in to comment"}
                    disabled={!meId}
                    rows={1}
                    className="scrollbar-none max-h-28 min-h-[2.75rem] w-full resize-none rounded-2xl border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 pr-11 text-[14px] text-white outline-none placeholder:text-white/35 disabled:opacity-45"
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[18px] leading-none opacity-45" aria-hidden>
                    🙂
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void sendComment()}
                  disabled={!meId || !commentText.trim()}
                  className="shrink-0 self-end rounded-full bg-accent-violet px-4 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShareCommentsBottomSheet({
  storyId,
  onClose,
}: {
  storyId: string | null;
  onClose: () => void;
}) {
  if (!storyId) return null;
  return <InnerSheet key={storyId} storyId={storyId} onFullyClosed={onClose} />;
}
