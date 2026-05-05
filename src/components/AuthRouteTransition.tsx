"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** Below InitialAppSplash (z 250000) so cold-open splash still wins if both are active. */
const AUTH_ROUTE_OVERLAY_Z = 240_000;
const FAILSAFE_MS = 18_000;

type AuthRouteTransitionContextValue = {
  /** Show full-screen branded logo (same asset as app splash) until `end()`. */
  start: () => void;
  /** Hide the overlay (safe to call even if not active). */
  end: () => void;
};

const AuthRouteTransitionContext = createContext<AuthRouteTransitionContextValue | null>(null);

export function useAuthRouteTransition(): AuthRouteTransitionContextValue {
  const ctx = useContext(AuthRouteTransitionContext);
  if (!ctx) {
    throw new Error("useAuthRouteTransition must be used within AuthRouteTransitionProvider");
  }
  return ctx;
}

export function AuthRouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  /** Browser timers are numeric IDs; avoids Node `Timeout` vs DOM mismatch in typings. */
  const failSafeRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "ah-auth-route-overlay-root";
    let el = document.getElementById(id) as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    setHost(el);
  }, []);

  const clearFailSafe = useCallback(() => {
    if (failSafeRef.current !== null) {
      window.clearTimeout(failSafeRef.current);
      failSafeRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setVisible(true);
    clearFailSafe();
    failSafeRef.current = window.setTimeout(() => {
      setVisible(false);
      failSafeRef.current = null;
    }, FAILSAFE_MS);
  }, [clearFailSafe]);

  const end = useCallback(() => {
    clearFailSafe();
    setVisible(false);
  }, [clearFailSafe]);

  const value = useMemo(() => ({ start, end }), [start, end]);

  const overlay =
    host && visible ? (
      <div
        className="pointer-events-auto fixed inset-0 flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black px-4"
        style={{ zIndex: AUTH_ROUTE_OVERLAY_Z, backgroundColor: "#000000" }}
        aria-busy="true"
        aria-label="Loading"
      >
        <div
          className="w-[min(92vw,720px)] max-w-[min(92vw,720px)] shrink-0 bg-center bg-no-repeat will-change-transform"
          style={{
            aspectRatio: "1024 / 512",
            backgroundColor: "#000000",
            backgroundImage: "url(/splash-intencity-logo.png)",
            backgroundSize: "contain",
          }}
        />
      </div>
    ) : null;

  return (
    <AuthRouteTransitionContext.Provider value={value}>
      {children}
      {host && overlay ? createPortal(overlay, host) : null}
    </AuthRouteTransitionContext.Provider>
  );
}
