"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import StoryCameraModal from "./StoryCameraModal";
import { supabase } from "@/lib/supabaseClient";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [storyOpen, setStoryOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const hideNav =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/chat/");

  // Keep Map fully immersive (nav overlays map).
  const immersive =
    pathname === "/map";
  const showFooter = !immersive && !pathname.startsWith("/chat");

  useEffect(() => {
    const openHandler = () => setStoryOpen(true);
    window.addEventListener("open-story-camera", openHandler);
    return () => window.removeEventListener("open-story-camera", openHandler);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadUnread = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setUnreadCount(0);
        return;
      }

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", user.id)
        .eq("read", false);

      if (mounted) setUnreadCount(count ?? 0);
    };

    loadUnread();
    timer = setInterval(loadUnread, 15000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [pathname]);

  return (
    <div className={hideNav || immersive ? "" : "pb-24"}>
      {children}
      {showFooter ? (
        <footer className="px-6 py-4 text-center text-xs text-white/40">
          <Link href="/privacy" className="hover:text-white/70 transition-colors">
            Privacy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-white/70 transition-colors">
            Terms
          </Link>
        </footer>
      ) : null}
      <StoryCameraModal open={storyOpen} onClose={() => setStoryOpen(false)} />
      {!hideNav && (
        <BottomNav onOpenStories={() => setStoryOpen(true)} unreadCount={unreadCount} />
      )}
    </div>
  );
}
