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
  const [composerKind, setComposerKind] = useState<"moments" | "shares">("moments");
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"both" | "shares_only">("both");
  const [createTab, setCreateTab] = useState<"moments" | "shares">("moments");
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [liveToasts, setLiveToasts] = useState<LiveToast[]>([]);
  const [mapVenueSheetOpen, setMapVenueSheetOpen] = useState(false);
  const [gestureRefreshing, setGestureRefreshing] = useState(false);

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

  const pullRefreshEnabled =
    pathname === "/hub" ||
    pathname === "/profile" ||
    pathname === "/notifications" ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/profile/friends") ||
    pathname.startsWith("/u/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

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
    const openHandler = () => {
      setComposerKind("moments");
      setStoryOpen(true);
    };
    const openCreateHandler = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: "both" | "shares_only"; tab?: "moments" | "shares" }>;
      const mode = custom.detail?.mode === "shares_only" ? "shares_only" : "both";
      setCreateMode(mode);
      setCreateTab(custom.detail?.tab ?? (mode === "shares_only" ? "shares" : "moments"));
      setCreateOpen(true);
    };
    window.addEventListener("open-story-camera", openHandler);
    window.addEventListener("open-create-composer", openCreateHandler as EventListener);
    return () => {
      window.removeEventListener("open-story-camera", openHandler);
      window.removeEventListener("open-create-composer", openCreateHandler as EventListener);
    };
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

  // Production only: let new service workers activate and reload once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reloadedForUpdate = false;

    const maybeReloadOnControllerChange = () => {
      if (reloadedForUpdate) return;
      reloadedForUpdate = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", maybeReloadOnControllerChange);

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      reg.update().catch(() => {});

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", maybeReloadOnControllerChange);
    };
  }, []);

  // Development SW/cache purge runs synchronously in root layout <head> (before chunks load).

  // Production only: if deployed CSS 404s (stale precache), unregister + clear once then reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const healMissingCss = async () => {
      const cssLink = document.querySelector('link[rel="stylesheet"][href*="/_next/static/css"]') as HTMLLinkElement | null;
      if (!cssLink?.href) return;
      try {
        const res = await fetch(cssLink.href, { method: "GET", cache: "no-store" });
        if (res.ok) return;
      } catch {
        // continue to recovery path
      }

      if (sessionStorage.getItem("ah-css-heal-ran") === "1") return;
      sessionStorage.setItem("ah-css-heal-ran", "1");

      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      window.location.reload();
    };

    window.setTimeout(() => {
      void healMissingCss();
    }, 150);
  }, []);

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
          let title = "Intencity";
          let body = "Something new is happening.";
          let route = "/notifications";
          if (row.type === "friend_joined_venue") {
            title = `${actorName} is at ${venue?.name ?? "a venue"} 👀`;
            body = "Tap to open map";
            route = row.venue_id ? `/map?venueId=${encodeURIComponent(row.venue_id)}` : "/map";
          } else if (row.type === "friend_nearby") {
            title = `${actorName} is nearby`;
            body = "Tap to open map";
            route = "/map";
          } else if (row.type === "friends_active_bundle") {
            title = "Friends are active 🔥";
            body = "Tap to open hub";
            route = "/hub";
          } else if (row.type === "friend_story") {
            title = `${actorName} posted a new Moment`;
            body = "Tap to open Moments";
            route = "/stories";
          } else if (row.type === "friend_request_received") {
            title = `${actorName} sent a friend request`;
            body = "Tap to respond";
            route = "/notifications";
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

  useEffect(() => {
    if (!pullRefreshEnabled) return;
    if (typeof window === "undefined") return;

    let startY: number | null = null;
    let mode: "none" | "top" | "bottom" = "none";
    let didTrigger = false;
    let lastTriggerAt = 0;
    let reloadTimer: number | null = null;

    const atTop = () => window.scrollY <= 2;
    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0]?.clientY ?? null;
      didTrigger = false;
      if (atTop()) mode = "top";
      else if (atBottom()) mode = "bottom";
      else mode = "none";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY === null || didTrigger) return;
      const y = e.touches[0]?.clientY;
      if (typeof y !== "number") return;
      const dy = y - startY;
      const now = Date.now();
      if (now - lastTriggerAt < 1200) return;

      if (mode === "top" && dy >= 85) {
        didTrigger = true;
        lastTriggerAt = now;
        setGestureRefreshing(true);
        reloadTimer = window.setTimeout(() => {
          window.location.reload();
        }, 280);
      } else if (mode === "bottom" && dy <= -85) {
        didTrigger = true;
        lastTriggerAt = now;
        setGestureRefreshing(true);
        reloadTimer = window.setTimeout(() => {
          window.location.reload();
        }, 280);
      }
    };

    const onTouchEnd = () => {
      startY = null;
      mode = "none";
      didTrigger = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      if (reloadTimer !== null) window.clearTimeout(reloadTimer);
    };
  }, [pullRefreshEnabled]);

  return (
    <div className={hideNav || immersive ? "" : "pb-24"}>
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[80] mx-auto flex w-full max-w-md flex-col gap-2 px-3">
        {gestureRefreshing ? (
          <div className="pointer-events-none mx-auto rounded-full border border-white/20 bg-black/65 px-3 py-1.5 backdrop-blur">
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/85 border-t-transparent" />
          </div>
        ) : null}
        {liveToasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => {
              setLiveToasts((prev) => prev.filter((t) => t.id !== toast.id));
              router.push(toast.route);
            }}
            className="pointer-events-auto rounded-2xl border border-accent-violet/35 bg-[#12121acc] px-3 py-3 text-left shadow-[0_0_0_1px_rgba(122,60,255,0.22),0_8px_30px_rgba(122,60,255,0.2)] backdrop-blur animate-[toastIn_.26s_ease-out]"
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
      {createOpen ? (
        <div className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 h-full w-full"
            onClick={() => setCreateOpen(false)}
            aria-label="Close create menu"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/15 bg-[#0a0c12] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
            {createMode === "both" ? (
              <div className="mb-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setCreateTab("moments")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    createTab === "moments" ? "bg-accent-violet/28 text-white" : "text-white/70"
                  }`}
                >
                  Moments
                </button>
                <button
                  type="button"
                  onClick={() => setCreateTab("shares")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    createTab === "shares" ? "bg-accent-violet/28 text-white" : "text-white/70"
                  }`}
                >
                  Shares
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setComposerKind(createMode === "shares_only" ? "shares" : createTab);
                setStoryOpen(true);
              }}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black"
            >
              {createMode === "shares_only" || createTab === "shares" ? "Create share" : "Create moment"}
            </button>
          </div>
        </div>
      ) : null}
      <StoryCameraModal
        open={storyOpen}
        mode={composerKind}
        onClose={() => setStoryOpen(false)}
      />
      {!hideNav && !mapVenueSheetOpen && (
        <BottomNav
          onOpenStories={() => {
            setCreateMode("both");
            setCreateTab("moments");
            setCreateOpen(true);
          }}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
}
