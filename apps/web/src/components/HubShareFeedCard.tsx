"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui";
import { formatSocialAgo } from "@/lib/time";

export type HubShareFeedCardModel = {
  id: string;
  user_id: string;
  username: string;
  image_url: string;
  created_at: string;
  avatar: string | null;
};

type HubShareFeedCardProps = {
  share: HubShareFeedCardModel;
  meId: string | null;
  /** When the signed-in user owns this share; enables hide/delete menu. */
  shareHidden?: boolean;
  likesCount: number;
  commentsCount: number;
  liked: boolean;
  likedByLine: string | null;
  commentPreviews: Array<{ id: string; username: string | null; content: string }>;
  onToggleLike: () => void;
  onOpenPost: () => void;
  onOpenComments: () => void;
  onOpenProfile: () => void;
  onToggleHideFromGrid?: () => void;
  onDeleteShare?: () => void;
};

export default function HubShareFeedCard({
  share,
  meId,
  shareHidden = false,
  likesCount,
  commentsCount,
  liked,
  likedByLine,
  commentPreviews,
  onToggleLike,
  onOpenPost,
  onOpenComments,
  onOpenProfile,
  onToggleHideFromGrid,
  onDeleteShare,
}: HubShareFeedCardProps) {
  const timeLabel = formatSocialAgo(share.created_at);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  const isOwnShare = !!meId && share.user_id === meId;
  const showOwnerMenu = isOwnShare && onToggleHideFromGrid && onDeleteShare;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = menuWrapRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <article className="w-full pb-10 last:pb-4">
      <div className="flex items-center gap-2.5 px-0.5 pb-2.5 pt-0.5">
        <button
          type="button"
          onClick={onOpenProfile}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition active:opacity-80"
          aria-label={`${share.username} profile`}
        >
          <Avatar src={share.avatar} fallbackText={share.username} size="sm" />
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold leading-tight text-white transition active:opacity-80"
        >
          {share.username}
        </button>
        {showOwnerMenu ? (
          <div ref={menuWrapRef} className="relative z-[50] shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="ah-glass-control ah-glass-control-interactive grid h-9 w-9 place-items-center rounded-full text-white"
              aria-label="Share options"
            >
              <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-[60] mt-1.5 min-w-[12.5rem] overflow-hidden rounded-xl border border-white/[0.12] bg-[#101015]/98 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleHideFromGrid();
                  }}
                  className="block w-full px-3 py-2.5 text-left text-[13px] text-white/90 hover:bg-white/[0.06]"
                >
                  {shareHidden ? "Unhide from grid" : "Hide from grid"}
                </button>
                <div className="my-1 h-px bg-white/[0.08]" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteShare();
                  }}
                  className="block w-full px-3 py-2.5 text-left text-[13px] text-red-300 hover:bg-red-500/15"
                >
                  Delete share
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpenPost}
        className="relative mx-auto block w-full max-w-md overflow-hidden rounded-[2px] bg-black/20"
        aria-label="View share"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={share.image_url}
          alt=""
          className="mx-auto max-h-[min(52vw,280px)] w-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      </button>

      <div className="mt-3 flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            disabled={!meId}
            className="rounded-full p-0.5 text-white transition enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart
              size={26}
              strokeWidth={1.65}
              className={liked ? "fill-red-500 text-red-500" : "text-white"}
              aria-hidden
            />
          </button>
          <span className="text-[15px] font-semibold tabular-nums text-white/90">{likesCount}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments();
          }}
          className="flex items-center gap-1.5 rounded-full p-1 text-white transition active:scale-95"
          aria-label={commentsCount ? `${commentsCount} comments` : "Open comments"}
        >
          <MessageCircle size={26} strokeWidth={1.65} className="text-white" aria-hidden />
          {commentsCount > 0 ? (
            <span className="text-[14px] font-semibold tabular-nums text-white">{commentsCount}</span>
          ) : null}
        </button>
      </div>

      {likedByLine ? (
        <p className="mt-2 px-0.5 text-[12px] leading-snug text-white/55">{likedByLine}</p>
      ) : null}

      {commentPreviews.length > 0 ? (
        <div className="mt-3 space-y-3 px-0.5">
          {commentPreviews.map((c) => (
            <div key={c.id} className="text-[12px] leading-snug text-white/80">
              <span className="font-bold text-white">{c.username?.trim() || "user"}</span>
              <span className="text-white/45"> </span>
              <span className="break-words font-normal">{c.content}</span>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onOpenPost}
        className="mt-2 block w-full px-0.5 text-left text-[12px] text-white/45 transition hover:text-white/55 active:text-white/60"
      >
        {timeLabel}
      </button>
    </article>
  );
}
