"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { appConfig } from "@/lib/appConfig";
import { isMarketingSite } from "@/lib/webSiteMode";
import { MarketingSiteShell } from "@/components/marketing/MarketingSiteShell";
import { useRouter } from "next/navigation";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";
import { ChevronLeft, Handshake, HelpCircle, Mail } from "lucide-react";

function ContactRow({
  icon,
  title,
  email,
  description,
}: {
  icon: ReactNode;
  title: string;
  email: string;
  description: string;
}) {
  return (
    <a
      href={`mailto:${email}`}
      className="group flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.05] hover:shadow-[0_8px_32px_rgba(59,102,255,0.1)] sm:p-5"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-primary/50 text-accent-violet shadow-[0_0_18px_rgba(59,102,255,0.15)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-sm font-medium text-accent-violet-active transition group-hover:text-accent-violet">
          {email}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>
      </div>
    </a>
  );
}

function ContactBody() {
  return (
    <>
      <p className="text-sm leading-relaxed text-white/55">
        Reach the {appConfig.appName} team. For account help, policy questions, or partnerships — use the
        address that fits.
      </p>

      <div className="mt-8 space-y-3">
        <ContactRow
          icon={<HelpCircle size={20} strokeWidth={1.75} aria-hidden />}
          title="Support"
          email={appConfig.supportEmail}
          description="Account issues, bugs, and in-app help."
        />
        <ContactRow
          icon={<Mail size={20} strokeWidth={1.75} aria-hidden />}
          title="General contact"
          email={appConfig.contactEmail}
          description="Questions about the product or policies."
        />
        <ContactRow
          icon={<Handshake size={20} strokeWidth={1.75} aria-hidden />}
          title="Partnerships"
          email={appConfig.partnershipsEmail}
          description="Venues, brands, and commercial inquiries."
        />
      </div>

      <p className="mt-10 text-center text-xs text-white/35">
        See also{" "}
        <Link href="/terms" className="text-white/55 underline underline-offset-2 hover:text-white/75">
          Terms
        </Link>
        ,{" "}
        <Link href="/privacy" className="text-white/55 underline underline-offset-2 hover:text-white/75">
          Privacy
        </Link>
        , and{" "}
        <Link href="/guidelines" className="text-white/55 underline underline-offset-2 hover:text-white/75">
          Community Guidelines
        </Link>
        .
      </p>
    </>
  );
}

export default function ContactPage() {
  if (isMarketingSite()) {
    return <MarketingContactPage />;
  }
  return <AppContactPage />;
}

function MarketingContactPage() {
  return (
    <MarketingSiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 rounded-lg py-1 text-sm font-medium text-white/55 transition hover:text-white/85"
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
          Home
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">Contact</h1>
        <div className="mt-3">
          <ContactBody />
        </div>
      </div>
    </MarketingSiteShell>
  );
}

function AppContactPage() {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] bg-primary px-6 pb-[max(env(safe-area-inset-bottom,0px),40px)] pt-[calc(env(safe-area-inset-top,0px)+32px)] text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <SubpageBackButton onBack={() => navigateBack(router, "/")} />
          <h1 className="min-w-0 flex-1 text-[1.25rem] font-bold tracking-tight">Contact</h1>
        </div>
        <ContactBody />
      </div>
    </div>
  );
}
