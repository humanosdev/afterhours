"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandedSplashLogo } from "@/components/BrandedSplashLogo";
import { AH_SPLASH_SESSION_KEY } from "@/lib/splashSession";

/**
 * Splash timing (not arbitrary “extra” logo time):
 * 1) MIN_MS_DEFAULT — minimum branded beat so the splash isn’t a sub‑flash.
 * 2) After that, only on `/hub` we wait for `ah-hub-feed-ready` (same gate as the hub feed skeleton).
 * 3) Only on `/map` we wait for `ah-map-ready` (Mapbox load → mapReady).
 * 4) Login, onboarding, etc.: minimum + fade only.
 */
const MIN_MS_DEFAULT = 1000;
const MIN_MS_REDUCED = 550;
const HUB_WAIT_MAX_MS = 12_000;
const MAP_WAIT_MAX_MS = 15_000;
const FADE_MS = 240;

type Phase = "off" | "on" | "out";

/**
 * Once per browser tab: full-screen #000 splash first for everyone.
 * Routes mount underneath (covered by splash); splash stays until:
 * - minimum time, and
 * - on `/hub` (signed in): hub {@link feedReady} (same gates as HubFeedSkeleton), and
 * - on `/map` (signed in): Mapbox `load` / {@link mapReady}.
 * Login and other routes: minimum time only.
 */
export default function InitialAppSplash({ isAuthed }: { isAuthed: boolean }) {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const authedRef = useRef(isAuthed);
  pathRef.current = pathname;
  authedRef.current = isAuthed;

  const [host, setHost] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>("off");
  const started = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "ah-splash-root";
    let el = document.getElementById(id) as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.setAttribute("aria-live", "off");
      el.style.cssText =
        "position:fixed;inset:0;z-index:250000;pointer-events:none;margin:0;padding:0;overflow:hidden;";
      document.body.appendChild(el);
    }
    setHost(el);
  }, []);

  /** When splash UI is unmounted (`phase === "off"`), keep `#ah-splash-root` from eating taps (it stays in DOM). */
  useEffect(() => {
    if (!host) return;
    host.style.pointerEvents = phase === "off" ? "none" : "auto";
  }, [host, phase]);

  /** Drop server-rendered boot splash when this tab already skipped the animated splash. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(AH_SPLASH_SESSION_KEY)) return;
    document.getElementById("ah-static-boot-splash")?.remove();
  }, []);

  /** Drop HTML boot layer in the same commit as the portal splash so there is no one-frame geometry swap. */
  useLayoutEffect(() => {
    if (phase !== "on" && phase !== "out") return;
    document.getElementById("ah-static-boot-splash")?.remove();
  }, [phase]);

  useEffect(() => {
    if (typeof window === "undefined" || !host) return;
    if (sessionStorage.getItem(AH_SPLASH_SESSION_KEY)) return;
    if (started.current) return;
    started.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minMs = reduced ? MIN_MS_REDUCED : MIN_MS_DEFAULT;

    const preload = new window.Image();
    preload.src = "/splash-intencity-logo.png";

    setPhase("on");
    /** Lock scroll on the splash layer only — avoids body scrollbar removal shifting centered art. */
    const prevHostOverflow = host.style.overflow;
    host.style.overflow = "hidden";

    let cancelled = false;

    const waitMin = () => new Promise<void>((resolve) => window.setTimeout(resolve, minMs));

    const waitHubIfNeeded = () =>
      new Promise<void>((resolve) => {
        if (pathRef.current !== "/hub" || !authedRef.current) {
          resolve();
          return;
        }
        const w = window as Window & { __ahHubFeedReady?: boolean };
        if (w.__ahHubFeedReady) {
          resolve();
          return;
        }
        const onReady = () => resolve();
        window.addEventListener("ah-hub-feed-ready", onReady, { once: true });
        window.setTimeout(onReady, HUB_WAIT_MAX_MS);
      });

    const waitMapIfNeeded = () =>
      new Promise<void>((resolve) => {
        if (pathRef.current !== "/map" || !authedRef.current) {
          resolve();
          return;
        }
        const w = window as Window & { __ahMapReady?: boolean };
        if (w.__ahMapReady) {
          resolve();
          return;
        }
        const onReady = () => resolve();
        window.addEventListener("ah-map-ready", onReady, { once: true });
        window.setTimeout(onReady, MAP_WAIT_MAX_MS);
      });

    void (async () => {
      await waitMin();
      if (cancelled) return;
      if (pathRef.current === "/hub" && authedRef.current) {
        await waitHubIfNeeded();
      } else if (pathRef.current === "/map" && authedRef.current) {
        await waitMapIfNeeded();
      }
      if (cancelled) return;
      if (reduced) {
        sessionStorage.setItem(AH_SPLASH_SESSION_KEY, "1");
        if (!cancelled) setPhase("off");
        host.style.overflow = prevHostOverflow;
        window.dispatchEvent(new CustomEvent("ah-splash-finished"));
        return;
      }
      if (!cancelled) setPhase("out");
      await new Promise<void>((resolve) => window.setTimeout(resolve, FADE_MS));
      if (cancelled) return;
      sessionStorage.setItem(AH_SPLASH_SESSION_KEY, "1");
      if (!cancelled) setPhase("off");
      host.style.overflow = prevHostOverflow;
      window.dispatchEvent(new CustomEvent("ah-splash-finished"));
    })();

    return () => {
      cancelled = true;
      host.style.overflow = prevHostOverflow;
      if (!sessionStorage.getItem(AH_SPLASH_SESSION_KEY)) started.current = false;
    };
  }, [host]);

  if (!host || phase === "off") return null;

  const inner = (
    <div
      className={`flex min-h-[100dvh] w-full items-center justify-center px-4 transition-opacity duration-[280ms] ease-out ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#000000" }}
      aria-hidden
    >
      <BrandedSplashLogo />
    </div>
  );

  return createPortal(inner, host);
}
