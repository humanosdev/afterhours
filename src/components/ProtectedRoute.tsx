"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandedSplashLogo } from "@/components/BrandedSplashLogo";
import { useClientAuth } from "@/contexts/ClientAuthContext";

/**
 * Full-screen layer above AppShell while sending the user to `/login`.
 * Unmounts when `router.replace` completes and this route is no longer active.
 */
function SignedOutRedirectHold() {
  if (typeof document === "undefined") {
    return (
      <div
        className="flex min-h-[100dvh] w-screen flex-col items-center justify-center bg-black px-4"
        aria-hidden
      >
        <BrandedSplashLogo />
      </div>
    );
  }
  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[251000] flex flex-col items-center justify-center bg-black px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Redirecting to sign in"
    >
      <BrandedSplashLogo />
      <p className="mt-8 text-center text-sm text-white/45">Taking you to sign in…</p>
    </div>,
    document.body
  );
}

/**
 * Uses `AppShell`’s session snapshot so client-side tab switches skip the branded “checking”
 * screen and go straight to page skeletons / content when the session is already known.
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionResolved, userId } = useClientAuth();
  const kickOnceRef = useRef(false);

  const loginWithReturn = useCallback(() => {
    const qs = typeof window !== "undefined" ? window.location.search : "";
    const next = encodeURIComponent(`${pathname}${qs}`);
    router.replace(`/login?next=${next}`);
  }, [router, pathname]);

  useEffect(() => {
    if (!sessionResolved || userId) {
      kickOnceRef.current = false;
      return;
    }
    if (kickOnceRef.current) return;
    kickOnceRef.current = true;
    loginWithReturn();
  }, [sessionResolved, userId, loginWithReturn]);

  if (!sessionResolved) {
    return (
      <div
        className="flex min-h-[100dvh] w-screen flex-col items-center justify-center bg-black px-4"
        aria-busy="true"
        aria-label="Checking session"
      >
        <BrandedSplashLogo />
      </div>
    );
  }

  if (!userId) {
    return <SignedOutRedirectHold />;
  }

  return <>{children}</>;
}
