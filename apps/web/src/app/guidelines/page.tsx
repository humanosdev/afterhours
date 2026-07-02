"use client";

import { isMarketingSite } from "@/lib/webSiteMode";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { guidelinesSections } from "@/content/legalCopy";
import { useRouter } from "next/navigation";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";

export default function GuidelinesPage() {
  if (isMarketingSite()) {
    return (
      <MarketingDocumentPage
        title="Community Guidelines"
        subtitle="Keep Intencity safe, social, and respectful."
        sections={guidelinesSections}
      />
    );
  }

  return <AppGuidelinesPage />;
}

function AppGuidelinesPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-primary px-6 pb-[max(env(safe-area-inset-bottom,0px),40px)] pt-[calc(env(safe-area-inset-top,0px)+32px)] text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <SubpageBackButton onBack={() => navigateBack(router, "/settings")} />
          <h1 className="min-w-0 flex-1 text-[1.25rem] font-bold tracking-tight">Community Guidelines</h1>
        </div>
        <p className="text-sm text-white/60">Keep Intencity safe, social, and respectful.</p>

        <div className="mt-8 space-y-5 text-sm leading-relaxed text-white/85">
          {guidelinesSections.flatMap((s) => s.paragraphs).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
