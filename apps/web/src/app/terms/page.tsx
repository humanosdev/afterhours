"use client";

import { appConfig } from "@/lib/appConfig";
import { useRouter } from "next/navigation";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-primary px-6 pb-[max(env(safe-area-inset-bottom,0px),40px)] pt-[calc(env(safe-area-inset-top,0px)+32px)] text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <SubpageBackButton onBack={() => navigateBack(router, "/settings")} />
          <h1 className="min-w-0 flex-1 text-[1.25rem] font-bold tracking-tight">Terms of Service</h1>
        </div>
        <p className="mt-3 text-sm text-white/60">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/85">
          <section>
            <h2 className="text-white font-semibold mb-2">Eligibility</h2>
            <p>
              You must be at least {appConfig.minimumAge} years old to use {appConfig.appName}.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Acceptable use</h2>
            <p>
              Use {appConfig.appName} respectfully. Harassment, impersonation, abuse, or attempts to misuse
              real-time location signals are prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Account responsibility</h2>
            <p>
              You are responsible for your account activity and credentials. Contact {appConfig.supportEmail}
              if your account is compromised. Venue, brand, or partnership inquiries:{" "}
              {appConfig.partnershipsEmail}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

