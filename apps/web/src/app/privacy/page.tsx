"use client";

import { isMarketingSite } from "@/lib/webSiteMode";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { privacyLastUpdated, privacySections } from "@/content/legalCopy";
import { useRouter } from "next/navigation";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";

export default function PrivacyPage() {
  if (isMarketingSite()) {
    return (
      <MarketingDocumentPage
        title="Privacy Policy"
        lastUpdated={privacyLastUpdated}
        sections={privacySections}
      />
    );
  }

  return <AppPrivacyPage />;
}

function AppPrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-primary px-6 pb-[max(env(safe-area-inset-bottom,0px),40px)] pt-[calc(env(safe-area-inset-top,0px)+32px)] text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <SubpageBackButton onBack={() => navigateBack(router, "/settings")} />
          <h1 className="min-w-0 flex-1 text-[1.25rem] font-bold tracking-tight">Privacy Policy</h1>
        </div>
        <p className="mt-3 text-sm text-white/60">Last updated: {privacyLastUpdated}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/85">
          {privacySections.map((section, i) => (
            <section key={i}>
              {section.heading ? (
                <h2 className="mb-2 font-semibold text-white">{section.heading}</h2>
              ) : null}
              {section.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
