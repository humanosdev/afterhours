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
    <div className="min-h-screen bg-black text-white grid place-items-center p-6">
      <div className="text-sm text-white/60">Opening camera…</div>
    </div>
  );
}