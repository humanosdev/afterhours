"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type StoryRow = {
  id: string;
  media_url: string;
};

export default function ProfileStoriesGrid({
  userId,
  emptyLabel = "No moments yet",
  emptySubtitle,
}: {
  userId: string | null;
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
      const { data, error } = await supabase
        .from("stories")
        .select("id, image_url")
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
          id: s.id as string,
          media_url: (s.image_url ?? "") as string,
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
  }, [userId]);

  if (loading) {
    return <div className="py-10 text-center text-[13px] text-white/45">Loading…</div>;
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <ImagePlus className="h-8 w-8 text-white/22" strokeWidth={1.5} aria-hidden />
        <p className="mt-3 text-[15px] font-semibold text-white/75">{emptyLabel}</p>
        {emptySubtitle ? (
          <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-white/38">{emptySubtitle}</p>
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
          className="aspect-square w-full bg-[#0a0a0c]"
          onClick={() => router.push(`/moments/${encodeURIComponent(story.id)}`)}
          aria-label="Open Moment"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.media_url} className="h-full w-full object-cover" alt="Moment" />
        </button>
      ))}
    </div>
  );
}
