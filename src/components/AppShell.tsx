"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BottomNav from "./BottomNav";
import StoryCameraModal from "./StoryCameraModal";
import { supabase } from "@/lib/supabaseClient";

type LiveToast = {
  id: string;
  title: string;
  body: string;
  route: string;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [storyOpen, setStoryOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [liveToasts, setLiveToasts] = useState<LiveToast[]>([]);
  const [mapVenueSheetOpen, setMapVenueSheetOpen] = useState(false);

  const hideNavPaths = [
    "/login",
    "/signup",
    "/privacy",
    "/terms",
    "/guidelines",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
  ];
  const hideNav =
    hideNavPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/chat/");

  // Keep Map fully immersive (nav overlays map).
  const immersive =
    pathname === "/map";
  const showFooter = !immersive && !pathname.startsWith("/chat");

  useEffect(() => {
    const onMapVenueSheetVisibility = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      setMapVenueSheetOpen(!!custom.detail?.open);
    };
    window.addEventListener("map-venue-sheet-visibility", onMapVenueSheetVisibility);
    return () => window.removeEventListener("map-venue-sheet-visibility", onMapVenueSheetVisibility);
  }, []);

  useEffect(() => {
    if (pathname !== "/map") {
      setMapVenueSheetOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const openHandler = () => setStoryOpen(true);
    window.addEventListener("open-story-camera", openHandler);
    return () => window.removeEventListener("open-story-camera", openHandler);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setCurrentUserId(data.session?.user.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setCurrentUserId(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`live-notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
          const row = payload.new as any;
          const [{ data: actor }, { data: venue }] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", row.actor_user_id)
              .maybeSingle(),
            row.venue_id
              ? supabase.from("venues").select("name").eq("id", row.venue_id).maybeSingle()
              : Promise.resolve({ data: null, error: null } as any),
          ]);
          const actorName = actor?.display_name || actor?.username || "Someone";
          let title = "AfterHours";
          let body = "Something new is happening.";
          let route = "/notifications";
          if (row.type === "friend_joined_venue") {
            title = `${actorName} just got to ${venue?.name ?? "a venue"} 👀`;
            body = "Tap to open map";
            route = row.venue_id ? `/map?venueId=${encodeURIComponent(row.venue_id)}` : "/map";
          } else if (row.type === "friends_active_bundle") {
            title = "Friends are active 🔥";
            body = "Tap to open hub";
            route = "/hub";
          } else if (row.type === "friend_story") {
            title = `${actorName} posted a new Moment`;
            body = "Tap to open Moments";
            route = "/stories";
          } else if (row.type === "friend_request_accepted") {
            title = `You and ${actorName} are now connected`;
            body = "Tap to view profile";
            route = row.actor_user_id ? `/profile/${row.actor_user_id}` : "/notifications";
          } else if (row.type === "venue_popping") {
            title = `${venue?.name ?? "A venue"} is heating up 🔥`;
            body = "Tap to open map";
            route = row.venue_id ? `/map?venueId=${encodeURIComponent(row.venue_id)}` : "/map";
          } else if (row.type === "friend_online") {
            title = `${actorName} is out right now`;
            body = "Tap to open hub";
            route = "/hub";
          }

          const toast: LiveToast = {
            id: row.id,
            title,
            body,
            route,
          };
          setLiveToasts((prev) => [...prev, toast].slice(-3));
          window.setTimeout(() => {
            setLiveToasts((prev) => prev.filter((t) => t.id !== row.id));
          }, 3800);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return (
    <div className={hideNav || immersive ? "" : "pb-24"}>
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[80] mx-auto flex w-full max-w-md flex-col gap-2 px-3">
        {liveToasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => {
              setLiveToasts((prev) => prev.filter((t) => t.id !== toast.id));
              router.push(toast.route);
            }}
            className="pointer-events-auto rounded-2xl border border-accent-violet/35 bg-[#12121acc] px-3 py-3 text-left shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_8px_30px_rgba(139,92,246,0.18)] backdrop-blur animate-[toastIn_.26s_ease-out]"
          >
            <div className="text-sm font-semibold text-white">{toast.title}</div>
            <div className="mt-0.5 text-xs text-text-secondary">{toast.body}</div>
          </button>
        ))}
      </div>
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
      {!hideNav && !mapVenueSheetOpen && (
        <BottomNav onOpenStories={() => setStoryOpen(true)} unreadCount={unreadCount} />
      )}
    </div>
  );
}
