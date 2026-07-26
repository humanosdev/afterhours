import { useEffect, useState } from "react";
import { POST_AUTH_ONBOARDING, peekPostAuthHref, resolvePostAuthHref } from "../lib/authRouting";
import { isMapBootReady, subscribeMapBootGate } from "../lib/mapBootGate";
import { prewarmTabShellData } from "../lib/tabShellPrewarm";
import { useAuth } from "../providers/AuthProvider";

const SIGNED_IN_BOOT_FAILSAFE_MS = 9000;

export type SignedInBootState = {
  ready: boolean;
  /** 0–1 boot milestones for the loading progress bar. */
  progress: number;
};

/**
 * True once signed-out users can enter, or signed-in users have tab prewarm + map reveal ready.
 * Keeps the hub logo boot veil up until the map tab can show pins/me without a pop-in.
 */
export function useSignedInBootReady(authLoading: boolean): SignedInBootState {
  const { user } = useAuth();
  const [ready, setReady] = useState(() => authLoading || Boolean(user?.id) === false);
  const [progress, setProgress] = useState(() => (authLoading ? 0.08 : user?.id ? 0 : 1));

  useEffect(() => {
    if (authLoading) {
      setReady(false);
      setProgress(0.12);
      return;
    }
    if (!user?.id) {
      setReady(true);
      setProgress(1);
      return;
    }

    let cancelled = false;
    let unsubscribeMap: (() => void) | undefined;
    setReady(false);
    setProgress(0.18);

    const finish = () => {
      if (!cancelled) {
        setProgress(1);
        setReady(true);
      }
    };

    const failsafe = setTimeout(finish, SIGNED_IN_BOOT_FAILSAFE_MS);

    void (async () => {
      try {
        const cached = peekPostAuthHref(user.id);
        const dest = cached ?? (await resolvePostAuthHref(user.id));
        if (cancelled) return;
        setProgress(0.38);

        await prewarmTabShellData(user.id);
        if (cancelled) return;
        setProgress(0.62);

        if (dest === POST_AUTH_ONBOARDING) {
          clearTimeout(failsafe);
          finish();
          return;
        }

        setProgress(0.78);

        if (isMapBootReady()) {
          clearTimeout(failsafe);
          finish();
          return;
        }

        unsubscribeMap = subscribeMapBootGate(() => {
          if (!isMapBootReady() || cancelled) return;
          clearTimeout(failsafe);
          unsubscribeMap?.();
          unsubscribeMap = undefined;
          finish();
        });
      } catch {
        if (!cancelled) {
          clearTimeout(failsafe);
          finish();
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      unsubscribeMap?.();
    };
  }, [authLoading, user?.id]);

  return { ready, progress };
}
