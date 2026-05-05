"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BottomNav from "./BottomNav";
import InitialAppSplash from "./InitialAppSplash";
import StoryCameraModal from "./StoryCameraModal";
import { InnerAppVioletUnderglow } from "./InnerAppVioletUnderglow";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { matchesAuthGatePath } from "@/lib/authGatePaths";
import { isValidCoordinatePair } from "@/lib/presence";
import { supabase } from "@/lib/supabaseClient";

/** Routes that already ship their own bottom violet wash (`AuthScreenShell` or marketing pages — avoid stacking). */
function shouldSkipAppShellBottomUnderglow(pathname: string) {
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return true;
  }
  if (pathname.startsWith("/onboarding")) return true;
  if (pathname === "/profile/blocks" || pathname === "/settings/notifications") return true;
  return false;
}

type LiveToast = {
  id: string;
  title: string;
  body: string;
  route: string;
  actorAvatarUrl?: string | null;
  actorUsername?: string | null;
};

function AvatarStub({ src, fallbackText }: { src: string | null; fallbackText: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={fallbackText} className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/12 text-xs font-semibold text-white/90">
      {fallbackText.trim().slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [storyOpen, setStoryOpen] = useState(false);
  const [composerKind, setComposerKind] = useState<"moments" | "shares">("moments");
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"both" | "shares_only">("both");
  const [createTab, setCreateTab] = useState<"moments" | "shares">("moments");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  /** First `getSession()` finished — avoids showing tab nav on gated routes before we know if there is a session. */
  const [authSessionResolved, setAuthSessionResolved] = useState(false);
  const [liveToasts, setLiveToasts] = useState<LiveToast[]>([]);
  const [mapVenueSheetOpen, setMapVenueSheetOpen] = useState(false);
  const [gestureRefreshing, setGestureRefreshing] = useState(false);
  /** Bottom nav mounts here so it sits above Mapbox/WebKit compositor layers (Safari desktop). */
  const [bottomNavHost, setBottomNavHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "ah-bottom-nav-root";
    let el = document.getElementById(id) as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    setBottomNavHost(el);
  }, []);

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

  /** Session gates — hide main tab bar until signed-in user confirmed (mirrors middleware intent). */
  const suppressTabNavForAuthGate =
    matchesAuthGatePath(pathname) && (!authSessionResolved || !currentUserId);
  const showMainTabNav = !hideNav && !suppressTabNavForAuthGate;

  // Keep Map fully immersive (nav overlays map).
  const immersive =
    pathname === "/map";
  const showFooter =
    !immersive && !pathname.startsWith("/chat") && !suppressTabNavForAuthGate;
  const showBottomUnderglow =
    pathname !== "/map" && !shouldSkipAppShellBottomUnderglow(pathname);

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

    const clearBrokenSession = async () => {
      await supabase.auth.signOut({ scope: "local" });
      if (!mounted) return;
      setCurrentUserId(null);
      setAuthSessionResolved(true);
    };

    supabase.auth
      .getSession()
      .then(async ({ data, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) {
          console.warn("Auth: getSession failed:", sessionError.message);
          await clearBrokenSession();
          return;
        }
        if (!data.session) {
          setCurrentUserId(null);
          setAuthSessionResolved(true);
          return;
        }
        const { error: userError } = await supabase.auth.getUser();
        if (!mounted) return;
        if (userError) {
          console.warn("Auth: session invalid (sign in again):", userError.message);
          await clearBrokenSession();
          return;
        }
        setCurrentUserId(data.session.user.id);
        setAuthSessionResolved(true);
      })
      .catch(async (e: unknown) => {
        console.warn("Auth: session bootstrap failed:", e);
        await clearBrokenSession();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setCurrentUserId(session?.user.id ?? null);
      setAuthSessionResolved(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Write `user_presence` (lat/lng/updated_at) on every main app surface — not only `/map`.
   * The map page still runs venue/zone assignment for `venue_id`; this keeps “last seen” fresh on Hub/Chat/Profile.
   */
  useEffect(() => {
    if (!currentUserId) return;
    const authMarketing = new Set([
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
    ]);
    if (authMarketing.has(pathname)) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (!isValidCoordinatePair(lat, lng)) return;
          void supabase.from("user_presence").upsert(
            {
              user_id: currentUserId,
              lat,
              lng,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        },
        () => {
          /* permission denied or unavailable */
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
      );
    };

    ping();
    const interval = window.setInterval(ping, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentUserId, pathname]);

  useEffect(() => {
    if (!currentUserId) {
      setChatUnreadCount(0);
      return;
    }
    let cancelled = false;
    const loadUnread = async () => {
      const { count: messageCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", currentUserId)
        .eq("read", false)
        .eq("type", "message");
      if (cancelled) return;
      setChatUnreadCount(messageCount ?? 0);
    };
    void loadUnread();

    const channel = supabase
      .channel(`live-notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const row = (payload.new ?? payload.old ?? null) as
            | { type?: string; read?: boolean; id?: string; actor_user_id?: string; message_preview?: string | null; chat_id?: string | null }
            | null;
          if (row && payload.eventType === "INSERT" && row.type === "message" && row.read === false) {
            const { data: actor } = await supabase
              .from("profiles")
              .select("username, avatar_url, display_name")
              .eq("id", row.actor_user_id)
              .maybeSingle();
            setLiveToasts((prev) => [
              ...prev.slice(-2),
              {
                id: row.id ?? `${Date.now()}`,
                title: actor?.display_name || actor?.username || "New message",
                body: row.message_preview || "Sent you a message",
                route: row.chat_id ? `/chat/${row.chat_id}` : "/chat",
                actorAvatarUrl: actor?.avatar_url ?? null,
                actorUsername: actor?.username ?? null,
              },
            ]);
            window.setTimeout(() => {
              setLiveToasts((prev) => prev.filter((t) => t.id !== (row.id ?? "")));
            }, 6000);
          }
          void loadUnread();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

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
    if (pathname.startsWith("/chat")) {
      setLiveToasts([]);
    }
  }, [pathname]);

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
    <ClientAuthProvider
      value={{ sessionResolved: authSessionResolved, userId: currentUserId }}
    >
    <div className={hideNav || immersive || !showMainTabNav ? "" : "pb-24"}>
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[10050] mx-auto flex w-full max-w-md flex-col items-start gap-2 px-3">
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
            <div className="flex items-center gap-2.5">
              <AvatarStub src={toast.actorAvatarUrl ?? null} fallbackText={toast.title} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{toast.title}</div>
                <div className="mt-0.5 truncate text-xs text-text-secondary">{toast.body}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {showBottomUnderglow ? <InnerAppVioletUnderglow /> : null}
      <div className="relative z-[2] min-h-0">{children}</div>
      {showFooter ? (
        <footer className="relative z-[2] px-6 py-4 text-center text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          <Link href="/privacy" className="transition-colors hover:text-white/90">
            Privacy
          </Link>
          <span className="mx-2 text-white/45">·</span>
          <Link href="/terms" className="transition-colors hover:text-white/90">
            Terms
          </Link>
        </footer>
      ) : null}
      {createOpen ? (
        <div className="fixed inset-0 z-[10200] bg-black/65 backdrop-blur-sm">
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
      {/* Portaled to #ah-bottom-nav-root (display:contents; nav z-[10000]). */}
      {bottomNavHost && showMainTabNav && !(pathname === "/map" && mapVenueSheetOpen)
        ? createPortal(
            <BottomNav
              onOpenStories={() => {
                setCreateMode("both");
                setCreateTab("moments");
                setCreateOpen(true);
              }}
              chatUnreadCount={chatUnreadCount}
            />,
            bottomNavHost
          )
        : null}
      <InitialAppSplash isAuthed={!!currentUserId} />
    </div>
    </ClientAuthProvider>
  );
}
