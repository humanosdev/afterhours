"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type StoryRow = {
  id: string;
  media_url: string;
  created_at?: string | null;
  expires_at?: string | null;
  is_share?: boolean;
  share_visible?: boolean;
  share_hidden?: boolean;
};

export default function ProfileStoriesGrid({
  userId,
  viewerId = null,
  mode = "shares",
  emptyLabel = "No moments yet",
  emptySubtitle,
}: {
  userId: string | null;
  viewerId?: string | null;
  mode?: "shares" | "archive";
  emptyLabel?: string;
  emptySubtitle?: string;
}) {
  const router = useRouter();
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStories([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadStories = async () => {
      setLoading(true);
      const isOwner = !!viewerId && viewerId === userId;
      let rowsRaw: any[] = [];

      // Preferred schema (after migration).
      const preferredQuery = supabase
        .from("stories")
        .select("id, image_url, created_at, expires_at, is_share, share_visible, share_hidden")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const preferred = await preferredQuery;

      if (preferred.error) {
        // Backward-compatible fallback before migrations are applied.
        const fallback = await supabase
          .from("stories")
          .select("id, image_url, created_at, expires_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (fallback.error) {
          console.error("profile stories fetch error:", fallback.error);
          if (!mounted) return;
          setStories([]);
          setLoading(false);
          return;
        }
        rowsRaw = (fallback.data ?? []).map((row: any) => ({
          ...row,
          is_share: false,
          share_visible: false,
          share_hidden: false,
        }));
      } else {
        rowsRaw = preferred.data ?? [];
      }

      if (!mounted) return;
      const now = Date.now();
      const rows = (rowsRaw as any[])
        .filter((s) => {
          const isShare = !!s.is_share;
          const shareVisible = !!s.share_visible;
          const shareHidden = !!s.share_hidden;
          const createdAtMs = new Date(s.created_at ?? 0).getTime();
          const fallbackExpiresMs = Number.isFinite(createdAtMs)
            ? createdAtMs + 24 * 60 * 60 * 1000
            : 0;
          const expiresMs = s.expires_at ? new Date(s.expires_at).getTime() : fallbackExpiresMs;
          const isExpiredMoment = !isShare && Number.isFinite(expiresMs) && expiresMs <= now;

          if (mode === "archive") {
            if (!isOwner) return false;
            return isExpiredMoment || (isShare && shareHidden);
          }

          // mode: shares
          if (!isShare) return false;
          if (shareHidden) return false;
          if (isOwner) return true;
          return shareVisible;
        })
        .map((s) => ({
          id: s.id as string,
          media_url: (s.image_url ?? "") as string,
          created_at: (s.created_at ?? null) as string | null,
          expires_at: (s.expires_at ?? null) as string | null,
          is_share: !!s.is_share,
          share_visible: !!s.share_visible,
          share_hidden: !!s.share_hidden,
        }))
        .filter((s) => !!s.media_url);
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
  }, [userId, viewerId, mode]);

  if (loading) {
    return <div className="py-10 text-center text-[13px] text-white/45">Loading…</div>;
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImagePlus className="h-7 w-7 text-accent-violet/35" strokeWidth={1.5} aria-hidden />
        <p className="mt-3 text-[15px] font-semibold tracking-tight text-white/82">{emptyLabel}</p>
        {emptySubtitle ? (
          <p className="mt-1.5 max-w-[280px] text-[13px] leading-snug text-white/42">{emptySubtitle}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-px bg-white/[0.08]">
      {stories.map((story) => (
        <button
          key={story.id}
          type="button"
          className="relative aspect-square w-full overflow-hidden bg-[#0a0a0c]"
          onClick={() =>
            router.push(
              `/moments/${encodeURIComponent(story.id)}${mode === "archive" ? "?view=archive" : ""}`
            )
          }
          aria-label="Open Moment"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.media_url} className="h-full w-full object-cover" alt="Moment" />
          {mode === "archive" && story.created_at ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-6 text-left text-[10px] font-medium text-white/90">
              {new Date(story.created_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
