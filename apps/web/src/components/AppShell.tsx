"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import BottomNav from "./BottomNav";
import InitialAppSplash from "./InitialAppSplash";
import StoryCameraModal from "./StoryCameraModal";
import ShareCommentsBottomSheet from "./ShareCommentsBottomSheet";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { matchesAuthGatePath } from "@/lib/authGatePaths";
import { isMarketingSite } from "@/lib/webSiteMode";
import { OPEN_SHARE_COMMENTS_EVENT, type OpenShareCommentsDetail } from "@/lib/shareCommentsSheet";
import { supabase } from "@/lib/supabaseClient";
import { Circle, Images } from "lucide-react";

/** Session-only: after OK, do not re-show presence/geo toasts until a successful presence write (user fixed location). */
const LOCATION_NOTICE_SUPPRESS_KEY = "ah_location_notice_dismissed";

function isLocationNoticeSuppressed() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(LOCATION_NOTICE_SUPPRESS_KEY) === "1";
  } catch {
    return false;
  }
}

function suppressLocationNoticeForSession() {
  try {
    sessionStorage.setItem(LOCATION_NOTICE_SUPPRESS_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}

function clearLocationNoticeSuppressed() {
  try {
    sessionStorage.removeItem(LOCATION_NOTICE_SUPPRESS_KEY);
  } catch {
    /* ignore */
  }
}

/** Story viewer / camera use swipe-down-to-dismiss; window-level pull-to-refresh must ignore those touches. */
function pullRefreshTouchBeganOnFullscreenSuppressorHost(e: TouchEvent): boolean {
  const t = e.target;
  if (t == null || typeof document === "undefined") return false;
  const el = t instanceof Element ? t : (t as Node).parentElement;
  return !!(el && typeof el.closest === "function" && el.closest("[data-ah-suppress-window-pull-refresh]"));
}

/**
 * Main tab surfaces scroll inside `overflow-y-auto` columns, not on `window`.
 * Used so pull-to-refresh only arms when that column is scrolled to the top.
 */
function findVerticalScrollContainerForPull(target: EventTarget | null): HTMLElement {
  const root = (document.scrollingElement ?? document.documentElement) as HTMLElement;
  if (!target || !(target instanceof Element)) return root;
  let el: Element | null = target;
  while (el && el !== document.body) {
    if (!(el instanceof HTMLElement)) {
      el = el.parentElement;
      continue;
    }
    const { overflowY } = window.getComputedStyle(el);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return root;
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
  /** Fullscreen story viewer — hide portaled tab bar so it does not stack over the viewer. */
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [shareCommentsStoryId, setShareCommentsStoryId] = useState<string | null>(null);
  const [gestureRefreshing, setGestureRefreshing] = useState(false);
  /** Pull-to-refresh: damped offset (px) + progress for top chrome indicator. */
  const [pullTopUi, setPullTopUi] = useState<{ displayPx: number; progress: number; snap: boolean } | null>(null);
  /** Geolocation or presence-save issues — short, dismissible */
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  /** Bumped on OK so in-flight `getCurrentPosition` callbacks cannot re-open the notice after dismiss. */
  const locationNoticeEpochRef = useRef(0);
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

  // Keep map / tab switches clean — window scroll must not leak into the next route.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    setPullTopUi(null);
    setGestureRefreshing(false);
  }, [pathname]);

  const hideNavPaths = [
    "/",
    "/login",
    "/signup",
    "/privacy",
    "/terms",
    "/guidelines",
    "/contact",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
    "/search",
    "/settings",
    "/notifications",
    "/live-places",
    "/venue-activity",
    "/archive",
    "/moments",
  ];
  const hideNav =
    hideNavPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/profile/edit") ||
    pathname.startsWith("/profile/blocks") ||
    pathname.startsWith("/profile/friends");

  /** Session gates — hide main tab bar until signed-in user confirmed (mirrors middleware intent). */
  const suppressTabNavForAuthGate =
    matchesAuthGatePath(pathname) && (!authSessionResolved || !currentUserId);
  const showMainTabNav = !hideNav && !suppressTabNavForAuthGate;

  // Keep Map fully immersive (nav overlays map).
  const immersive =
    pathname === "/map";

  const pullRefreshEnabled =
    pathname === "/hub" ||
    pathname === "/profile" ||
    pathname === "/notifications" ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/profile/friends") ||
    pathname.startsWith("/u/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/search";

  useEffect(() => {
    const onMapVenueSheetVisibility = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      setMapVenueSheetOpen(!!custom.detail?.open);
    };
    window.addEventListener("map-venue-sheet-visibility", onMapVenueSheetVisibility);
    return () => window.removeEventListener("map-venue-sheet-visibility", onMapVenueSheetVisibility);
  }, []);

  useEffect(() => {
    const onStoryViewerVisibility = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      setStoryViewerOpen(!!custom.detail?.open);
    };
    window.addEventListener("ah-story-viewer-visibility", onStoryViewerVisibility as EventListener);
    return () => window.removeEventListener("ah-story-viewer-visibility", onStoryViewerVisibility as EventListener);
  }, []);

  useEffect(() => {
    if (pathname !== "/map") {
      setMapVenueSheetOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ah-story-camera-visibility", {
        detail: { open: createOpen || storyOpen || !!shareCommentsStoryId },
      })
    );
  }, [createOpen, storyOpen, shareCommentsStoryId]);

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
    const openComments = (event: Event) => {
      const d = (event as CustomEvent<OpenShareCommentsDetail>).detail;
      if (!d?.storyId || typeof d.storyId !== "string") return;
      setShareCommentsStoryId(d.storyId);
    };
    window.addEventListener(OPEN_SHARE_COMMENTS_EVENT, openComments as EventListener);
    return () => {
      window.removeEventListener("open-story-camera", openHandler);
      window.removeEventListener("open-create-composer", openCreateHandler as EventListener);
      window.removeEventListener(OPEN_SHARE_COMMENTS_EVENT, openComments as EventListener);
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


  /** Phase 6 — AppShell GPS / presence writes removed; native is sole writer. */

  useEffect(() => {
    if (isMarketingSite()) return;
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
    const authMarketing = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);
    if (authMarketing.has(pathname)) setLocationNotice(null);
  }, [pathname]);

  useEffect(() => {
    if (!pullRefreshEnabled) return;
    if (typeof window === "undefined") return;

    /** Raw finger travel (px) required before release will reload — feels like native “full” pull. */
    const releaseThresholdPx = () => Math.max(148, Math.min(190, window.innerHeight * 0.21));
    /** Visual follows pull with resistance so the gesture reads clearly on screen. */
    const dampedDisplay = (raw: number) => {
      const cap = 118;
      return Math.min(raw * 0.42, cap);
    };

    const vibrateCommitReady = () => {
      try {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(14);
        }
      } catch {
        /* ignore */
      }
    };

    let startY: number | null = null;
    let startX: number | null = null;
    let scrollHost: HTMLElement | null = null;
    let mode: "none" | "top" = "none";
    let lastTriggerAt = 0;
    let reloadTimer: number | null = null;
    let lastY: number | null = null;
    let didTopHapticThisStroke = false;
    let raf: number | null = null;
    let pendingTop: { displayPx: number; progress: number } | null = null;
    let suppressThisStroke = false;

    const cancelPullRaf = () => {
      if (raf !== null) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
      pendingTop = null;
    };

    const flushRaf = () => {
      raf = null;
      if (pendingTop) {
        const { displayPx, progress } = pendingTop;
        pendingTop = null;
        setPullTopUi((prev) => ({ displayPx, progress, snap: prev?.snap ?? false }));
      }
    };

    const scheduleTop = (displayPx: number, progress: number) => {
      pendingTop = { displayPx, progress };
      if (raf === null) raf = window.requestAnimationFrame(flushRaf);
    };

    const onTouchStart = (e: TouchEvent) => {
      suppressThisStroke = pullRefreshTouchBeganOnFullscreenSuppressorHost(e);
      if (suppressThisStroke) {
        startY = null;
        startX = null;
        scrollHost = null;
        lastY = null;
        mode = "none";
        cancelPullRaf();
        setPullTopUi(null);
        return;
      }
      if (e.touches.length !== 1) return;
      startY = e.touches[0]?.clientY ?? null;
      startX = e.touches[0]?.clientX ?? null;
      lastY = startY;
      didTopHapticThisStroke = false;
      if (startY === null) return;
      scrollHost = findVerticalScrollContainerForPull(e.target);
      mode = scrollHost.scrollTop <= 2 ? "top" : "none";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (suppressThisStroke) return;
      if (startY === null || scrollHost === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const y = touch.clientY;
      const x = touch.clientX;
      lastY = y;
      const dy = y - startY;
      const dx = startX !== null ? x - startX : 0;
      const th = releaseThresholdPx();

      if (mode === "top") {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (adx >= 12 || ady >= 12) {
          if (adx >= ady) {
            mode = "none";
            cancelPullRaf();
            setPullTopUi(null);
            return;
          }
        }
        if (scrollHost.scrollTop > 2 || dy <= 0) {
          cancelPullRaf();
          setPullTopUi(null);
          return;
        }
        const displayPx = dampedDisplay(dy);
        const progress = Math.min(1, dy / th);
        scheduleTop(displayPx, progress);
        if (dy >= th && !didTopHapticThisStroke) {
          didTopHapticThisStroke = true;
          vibrateCommitReady();
        }
      }
    };

    const snapTopAway = () => {
      cancelPullRaf();
      setPullTopUi((prev) => (prev ? { ...prev, snap: true, displayPx: 0, progress: 0 } : null));
      window.setTimeout(() => setPullTopUi(null), 300);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (suppressThisStroke) {
        suppressThisStroke = false;
        startY = null;
        startX = null;
        scrollHost = null;
        lastY = null;
        mode = "none";
        cancelPullRaf();
        setPullTopUi(null);
        if (reloadTimer !== null) {
          window.clearTimeout(reloadTimer);
          reloadTimer = null;
        }
        return;
      }
      const y0 = startY;
      const endTouch = e.changedTouches[0];
      const endY = endTouch?.clientY ?? lastY;
      const endedScrollHost = scrollHost;
      const modeEnded = mode;
      startY = null;
      startX = null;
      scrollHost = null;
      lastY = null;
      mode = "none";

      if (reloadTimer !== null) {
        window.clearTimeout(reloadTimer);
        reloadTimer = null;
      }

      if (y0 === null || typeof endY !== "number") {
        cancelPullRaf();
        setPullTopUi(null);
        return;
      }

      const dy = endY - y0;
      const th = releaseThresholdPx();
      const now = Date.now();

      if (modeEnded === "top") {
        if (dy >= th && endedScrollHost && endedScrollHost.scrollTop <= 2) {
          if (now - lastTriggerAt < 1200) {
            snapTopAway();
            return;
          }
          lastTriggerAt = now;
          cancelPullRaf();
          setGestureRefreshing(true);
          setPullTopUi(null);
          reloadTimer = window.setTimeout(() => {
            window.location.reload();
          }, 320);
          return;
        }
        snapTopAway();
      }
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
      cancelPullRaf();
      setPullTopUi(null);
    };
  }, [pullRefreshEnabled]);

  return (
    <ClientAuthProvider
      value={{ sessionResolved: authSessionResolved, userId: currentUserId }}
    >
    <div
      className={[
        "flex min-h-[100dvh] flex-col bg-primary",
        hideNav || immersive || !showMainTabNav || storyOpen || storyViewerOpen ? "" : "pb-20 sm:pb-24",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pullTopUi ? (
        <div
          className={[
            "pointer-events-none fixed inset-x-0 z-[24990] flex justify-center",
            pullTopUi.snap
              ? "transition-[transform,opacity] duration-[280ms] [transition-timing-function:cubic-bezier(0.25,0.9,0.28,1)]"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            top: 0,
            paddingTop: "max(10px, env(safe-area-inset-top, 0px))",
            transform: `translate3d(0, ${pullTopUi.displayPx}px, 0)`,
            opacity: pullTopUi.snap ? 0 : 0.32 + pullTopUi.progress * 0.68,
          }}
          aria-hidden
        >
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-primary/75 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md",
              pullTopUi.snap ? "transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.25,0.9,0.28,1)]" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              transform: `rotate(${pullTopUi.progress * 300}deg) scale(${0.88 + pullTopUi.progress * 0.12})`,
            }}
          >
            <span
              className={[
                "block h-[18px] w-[18px] rounded-full border-2 border-white/25 border-t-white/95",
                pullTopUi.progress >= 1 ? "border-t-accent-violet" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[25000] mx-auto flex w-full max-w-md flex-col items-start gap-2 px-3">
        {locationNotice ? (
          <div className="pointer-events-auto w-full rounded-2xl border border-accent-violet/35 bg-[#181c23cc] px-3 py-2.5 text-sm text-white shadow-[0_0_0_1px_rgba(59,102,255,0.22),0_8px_30px_rgba(59,102,255,0.2)] backdrop-blur animate-[toastIn_.26s_ease-out]">
            <div className="flex gap-2">
              <p className="min-w-0 flex-1 leading-snug text-white/90">{locationNotice}</p>
              <button
                type="button"
                onClick={() => {
                  locationNoticeEpochRef.current += 1;
                  suppressLocationNoticeForSession();
                  setLocationNotice(null);
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-accent-violet hover:bg-white/10"
              >
                OK
              </button>
            </div>
          </div>
        ) : null}
        {gestureRefreshing ? (
          <div className="ah-glass-control pointer-events-none mx-auto rounded-full px-3 py-1.5">
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
            className="pointer-events-auto rounded-2xl border border-accent-violet/35 bg-[#181c23cc] px-3 py-3 text-left shadow-[0_0_0_1px_rgba(59,102,255,0.22),0_8px_30px_rgba(59,102,255,0.2)] backdrop-blur animate-[toastIn_.26s_ease-out]"
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
      <div className="relative z-[2] min-h-0">{children}</div>
      {createOpen ? (
        <div className="fixed inset-0 z-[10200] bg-black/72 backdrop-blur-md">
          <button
            type="button"
            className="absolute inset-0 h-full w-full"
            onClick={() => setCreateOpen(false)}
            aria-label="Close create menu"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[1.35rem] border border-white/[0.1] border-b-0 bg-gradient-to-b from-secondary to-primary px-4 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-2 shadow-[0_-24px_80px_rgba(0,0,0,0.55)]">
            <div className="mx-auto mb-2 h-1 w-11 rounded-full bg-white/25" aria-hidden />
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Create</p>
            {createMode === "both" ? (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/25 p-1.5">
                <button
                  type="button"
                  onClick={() => setCreateTab("moments")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold transition ${
                    createTab === "moments"
                      ? "bg-accent-violet/35 text-white ring-1 ring-accent-violet-active/35"
                      : "text-white/55"
                  }`}
                >
                  <Circle size={18} strokeWidth={2} className={createTab === "moments" ? "text-white" : ""} aria-hidden />
                  Moment
                </button>
                <button
                  type="button"
                  onClick={() => setCreateTab("shares")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold transition ${
                    createTab === "shares"
                      ? "bg-accent-violet/35 text-white ring-1 ring-accent-violet-active/35"
                      : "text-white/55"
                  }`}
                >
                  <Images size={18} strokeWidth={2} className={createTab === "shares" ? "text-white" : ""} aria-hidden />
                  Share
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
              className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black shadow-glow-violet transition active:scale-[0.99]"
            >
              {createMode === "shares_only" || createTab === "shares" ? "Camera — share" : "Camera — moment"}
            </button>
            <p className="mt-2.5 text-center text-[11px] leading-snug text-white/38">
              {createMode === "shares_only" || createTab === "shares"
                ? "Portrait share · hub + profile grid"
                : "Moment · rings on the hub"}
            </p>
          </div>
        </div>
      ) : null}
      <StoryCameraModal
        open={storyOpen}
        mode={composerKind}
        onClose={() => setStoryOpen(false)}
      />
      <ShareCommentsBottomSheet storyId={shareCommentsStoryId} onClose={() => setShareCommentsStoryId(null)} />
      {/* Portaled to #ah-bottom-nav-root (display:contents; nav z-[10150]). */}
      {bottomNavHost &&
      showMainTabNav &&
      !(pathname === "/map" && mapVenueSheetOpen) &&
      !storyOpen &&
      !storyViewerOpen &&
      !shareCommentsStoryId
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
