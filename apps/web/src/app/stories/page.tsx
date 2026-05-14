"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StoriesPage() {
  const router = useRouter();

  useEffect(() => {
    // Legacy route bridge: keep one Moment experience (camera modal)
    window.dispatchEvent(new Event("open-story-camera"));
    router.replace("/hub");
  }, [router]);

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-primary px-6 pb-[max(env(safe-area-inset-bottom,0px),28px)] pt-[calc(env(safe-area-inset-top,0px)+28px)] text-white">
      <div className="text-sm text-white/60">Opening camera…</div>
    </div>
  );
}