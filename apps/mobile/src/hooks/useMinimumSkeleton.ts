import { useEffect, useRef, useState } from "react";
import { motion } from "../theme/motion";

/** Micro skeleton hold (thumbnails, inline chips). */
export const SKELETON_MIN_DISPLAY_MS = motion.skeleton.minDisplayMs;

/** Fitted layout shells — blocks cold-open layout jump. */
export const SKELETON_FITTED_MIN_DISPLAY_MS = motion.skeleton.fittedMinDisplayMs;

/** Section/list bands — shorter hold while a row is fetching. */
export const SKELETON_SECTION_MIN_DISPLAY_MS = motion.skeleton.sectionMinDisplayMs;

const fittedSessionRevealed = new Set<string>();

/** Reset on sign-out / dev fast refresh — call from clearSessionCaches if needed later. */
export function markFittedShellRevealed(sessionKey: string): void {
  if (sessionKey) fittedSessionRevealed.add(sessionKey);
}

export function clearFittedShellRevealCache(): void {
  fittedSessionRevealed.clear();
}

/** @deprecated Tab boot is driven by AppTabBootProvider remount — kept for cache reset. */
export function resetAppSessionBootShell(): void {
  /* no-op — resetTabBootSession handles consumed keys */
}

/**
 * Keeps skeleton visible at least `minMs` after loading starts — avoids sub-200ms flash on fast cache/network.
 * Skips the minimum hold when loading never became true (unless paired with tab focus hold).
 */
export function useMinimumSkeleton(loading: boolean, minMs: number = SKELETON_MIN_DISPLAY_MS): boolean {
  const [displayLoading, setDisplayLoading] = useState(loading);
  const shownAtRef = useRef<number | null>(loading ? Date.now() : null);
  const sawLoadingRef = useRef(loading);

  useEffect(() => {
    if (loading) {
      sawLoadingRef.current = true;
      shownAtRef.current = Date.now();
      setDisplayLoading(true);
      return;
    }

    if (!sawLoadingRef.current || shownAtRef.current == null) {
      setDisplayLoading(false);
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const delay = Math.max(0, minMs - elapsed);
    const timer = setTimeout(() => {
      shownAtRef.current = null;
      sawLoadingRef.current = false;
      setDisplayLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [loading, minMs]);

  return displayLoading;
}

/**
 * Fitted page/tab shell — always holds on first mount (even when session cache makes `loading` false
 * on frame 1), then while `loading` is true with the same minimum hold.
 * Pass `sessionKey` (e.g. tab id) to skip the boot hold on revisits in the same session.
 */
export function useFittedPageShell(
  loading: boolean,
  minMs: number = SKELETON_FITTED_MIN_DISPLAY_MS,
  sessionKey?: string
): boolean {
  const warmSession = Boolean(sessionKey && fittedSessionRevealed.has(sessionKey));
  const mountedAtRef = useRef(Date.now());
  const [bootHoldDone, setBootHoldDone] = useState(warmSession);
  const dataHold = useMinimumSkeleton(loading, minMs);
  const showShell = !bootHoldDone || dataHold;

  useEffect(() => {
    if (warmSession) return;
    const delay = Math.max(0, minMs - (Date.now() - mountedAtRef.current));
    const timer = setTimeout(() => setBootHoldDone(true), delay);
    return () => clearTimeout(timer);
  }, [minMs, warmSession]);

  useEffect(() => {
    if (!showShell && sessionKey) {
      fittedSessionRevealed.add(sessionKey);
    }
  }, [showShell, sessionKey]);

  return showShell;
}
