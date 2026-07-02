"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BrandedSplashLogo } from "@/components/BrandedSplashLogo";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { isMarketingSite } from "@/lib/webSiteMode";
import { createPortal } from "react-dom";

function SignedOutRedirectHold() {
  if (typeof document === "undefined") {
    return (
      <div
        className="flex min-h-[100dvh] w-screen flex-col items-center justify-center bg-primary px-4"
        aria-hidden
      >
        <BrandedSplashLogo />
      </div>
    );
  }
  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[251000] flex flex-col items-center justify-center bg-primary px-4"
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

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionResolved, userId } = useClientAuth();
  const kickOnceRef = useRef(false);
  const marketingSite = isMarketingSite();

  useEffect(() => {
    if (marketingSite) {
      router.replace("/");
    }
  }, [marketingSite, router]);

  const loginWithReturn = () => {
    const qs = typeof window !== "undefined" ? window.location.search : "";
    const next = encodeURIComponent(`${pathname}${qs}`);
    router.replace(`/login?next=${next}`);
  };

  useEffect(() => {
    if (marketingSite) return;
    if (!sessionResolved || userId) {
      kickOnceRef.current = false;
      return;
    }
    if (kickOnceRef.current) return;
    kickOnceRef.current = true;
    loginWithReturn();
  }, [marketingSite, sessionResolved, userId, pathname, router]);

  if (marketingSite) {
    return (
      <div
        className="flex min-h-[100dvh] w-screen flex-col items-center justify-center bg-primary px-4"
        aria-busy="true"
        aria-label="Redirecting"
      >
        <BrandedSplashLogo />
      </div>
    );
  }

  if (!sessionResolved) {
    return (
      <div
        className="flex min-h-[100dvh] w-screen flex-col items-center justify-center bg-primary px-4"
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
