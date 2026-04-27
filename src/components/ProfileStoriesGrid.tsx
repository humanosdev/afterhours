"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type StoryRow = {
  id: string;
  media_url: string;
};

export default function ProfileStoriesGrid({
  userId,
  emptyLabel = "No Moments Yet",
}: {
  userId: string | null;
  emptyLabel?: string;
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
    return <div className="mt-8 text-center text-sm text-white/50">Loading Moments…</div>;
  }

  if (stories.length === 0) {
    return <div className="mt-8 text-center text-sm text-white/40">{emptyLabel}</div>;
  }

  return (
    <div className="mt-4 grid grid-cols-3 gap-[2px]">
      {stories.map((story) => (
        <button
          key={story.id}
          type="button"
          className="aspect-square w-full bg-black"
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
