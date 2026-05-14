"use client";

import { Heart, MessageCircle } from "lucide-react";
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
  likesCount: number;
  commentsCount: number;
  liked: boolean;
  onToggleLike: () => void;
  onOpenPost: () => void;
  onOpenComments: () => void;
  onOpenProfile: () => void;
};

export default function HubShareFeedCard({
  share,
  meId,
  likesCount,
  commentsCount,
  liked,
  onToggleLike,
  onOpenPost,
  onOpenComments,
  onOpenProfile,
}: HubShareFeedCardProps) {
  const timeLabel = formatSocialAgo(share.created_at);

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
      </div>

      <button
        type="button"
        onClick={onOpenPost}
        className="relative block w-full overflow-hidden rounded-[2px] bg-black/20"
        aria-label="View share"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={share.image_url}
          alt=""
          className="aspect-[4/5] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </button>

      <div className="flex items-center gap-5 px-0.5 pt-3">
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments();
          }}
          className="flex items-center gap-1.5 rounded-full p-0.5 text-white transition active:scale-95"
          aria-label={commentsCount ? `${commentsCount} comments` : "Comments"}
        >
          <MessageCircle size={26} strokeWidth={1.65} className="text-white" aria-hidden />
          {commentsCount > 0 ? (
            <span className="text-[14px] font-semibold tabular-nums text-white">{commentsCount}</span>
          ) : null}
        </button>
      </div>

      {likesCount > 0 ? (
        <p className="mt-2 px-0.5 text-[14px] font-semibold leading-snug text-white">
          {likesCount.toLocaleString()} {likesCount === 1 ? "like" : "likes"}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onOpenPost}
        className="mt-1.5 block w-full px-0.5 text-left text-[12px] text-white/45 transition hover:text-white/55 active:text-white/60"
      >
        {timeLabel}
      </button>
    </article>
  );
}
