"use client";

import { appConfig } from "@/lib/appConfig";
import { useRouter } from "next/navigation";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-primary px-6 pb-[max(env(safe-area-inset-bottom,0px),40px)] pt-[calc(env(safe-area-inset-top,0px)+32px)] text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <SubpageBackButton onBack={() => navigateBack(router, "/settings")} />
          <h1 className="min-w-0 flex-1 text-[1.25rem] font-bold tracking-tight">Privacy Policy</h1>
        </div>
        <p className="mt-3 text-sm text-white/60">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/85">
          <section>
            <h2 className="text-white font-semibold mb-2">What we collect</h2>
            <p>
              {appConfig.appName} uses profile, presence, and social graph data to power real-time nightlife
              awareness. We collect account info, profile details, and location presence needed to show live
              venue activity.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">How data is used</h2>
            <p>
              We use your data to show where friends are active, generate venue activity, and power chat and
              notifications. We do not sell personal data.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Controls</h2>
            <p>
              You can edit your profile, block users, and manage notification preferences in settings. For
              support requests, contact {appConfig.supportEmail}. For general questions about this policy,
              contact {appConfig.contactEmail}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

