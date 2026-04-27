 "use client";

import { appConfig } from "@/lib/appConfig";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
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
              support requests, contact {appConfig.supportEmail}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

