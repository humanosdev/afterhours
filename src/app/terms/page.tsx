 "use client";

import { appConfig } from "@/lib/appConfig";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-primary px-6 pb-[max(env(safe-area-inset-bottom,0px),40px)] pt-[calc(env(safe-area-inset-top,0px)+32px)] text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-semibold">Terms of Service</h1>
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
              if your account is compromised.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

