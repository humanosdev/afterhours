"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthRouteTransition } from "@/components/AuthRouteTransition";
import { BrandedSplashLogo } from "@/components/BrandedSplashLogo";
import { HomeLanding } from "@/components/marketing/HomeLanding";
import { withTimeout } from "@/lib/withTimeout";

export default function HomePage() {
  const router = useRouter();
  const { start } = useAuthRouteTransition();
  const [gate, setGate] = useState<"checking" | "landing">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await withTimeout(supabase.auth.getSession(), 8000, {
        data: { session: null },
        error: null,
      });
      if (cancelled) return;
      if (data.session) {
        const prof = await withTimeout(
          supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("id", data.session.user.id)
            .maybeSingle(),
          8000,
          { data: null, error: null } as any
        );
        if (cancelled) return;
        start();
        router.replace(prof.data?.onboarding_complete ? "/hub" : "/onboarding");
        return;
      }
      setGate("landing");
    })();
    return () => {
      cancelled = true;
    };
  }, [router, start]);

  if (gate === "checking") {
    return (
      <div
        className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-primary px-4"
        aria-busy="true"
        aria-label="Loading"
      >
        <BrandedSplashLogo />
      </div>
    );
  }

  return <HomeLanding />;
}
