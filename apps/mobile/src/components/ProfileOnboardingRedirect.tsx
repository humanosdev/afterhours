import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { POST_AUTH_ONBOARDING, peekPostAuthHref, resolvePostAuthHref } from "../lib/authRouting";
import { isMapBootReady, markMapBootReady } from "../lib/mapBootGate";
import { useAuth } from "../providers/AuthProvider";

type ProfileOnboardingGateProps = {
  children: ReactNode;
};

/** Redirects incomplete profiles to onboarding; app shell stays mounted (no second boot overlay). */
export function ProfileOnboardingGate({ children }: ProfileOnboardingGateProps) {
  const { user } = useAuth();
  const cachedHref = user?.id ? peekPostAuthHref(user.id) : null;
  const [ready, setReady] = useState(() => cachedHref !== null);
  const [needsOnboarding, setNeedsOnboarding] = useState(
    () => cachedHref === POST_AUTH_ONBOARDING
  );

  useEffect(() => {
    if (!ready || needsOnboarding || isMapBootReady()) return;
    const id = setTimeout(() => markMapBootReady(), 4500);
    return () => clearTimeout(id);
  }, [ready, needsOnboarding]);

  useEffect(() => {
    if (!user?.id) {
      setReady(true);
      setNeedsOnboarding(false);
      return;
    }
    const peek = peekPostAuthHref(user.id);
    if (peek !== null) {
      setNeedsOnboarding(peek === POST_AUTH_ONBOARDING);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void resolvePostAuthHref(user.id)
      .then((dest) => {
        if (cancelled) return;
        setNeedsOnboarding(dest === POST_AUTH_ONBOARDING);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setNeedsOnboarding(false);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (ready && needsOnboarding) {
    return <Redirect href={POST_AUTH_ONBOARDING} />;
  }

  return children;
}
