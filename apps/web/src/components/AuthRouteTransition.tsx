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
import { IntencityBrandLockupImage } from "@/components/IntencityBrandLockupImage";

/** Below InitialAppSplash (z 250000) so cold-open splash still wins if both are active. */
const AUTH_ROUTE_OVERLAY_Z = 240_000;
const FAILSAFE_MS = 12_000;

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
        className="pointer-events-auto fixed inset-0 flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-primary px-4"
        style={{ zIndex: AUTH_ROUTE_OVERLAY_Z }}
        aria-busy="true"
        aria-label="Loading"
      >
        <IntencityBrandLockupImage variant="splash" fetchPriority="high" className="shrink-0" />
      </div>
    ) : null;

  return (
    <AuthRouteTransitionContext.Provider value={value}>
      {children}
      {host && overlay ? createPortal(overlay, host) : null}
    </AuthRouteTransitionContext.Provider>
  );
}
