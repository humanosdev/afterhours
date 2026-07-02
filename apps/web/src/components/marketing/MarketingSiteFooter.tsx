"use client";

import Link from "next/link";
import { appConfig } from "@/lib/appConfig";
import { MarketingBrandMark } from "@/components/marketing/MarketingBrandMark";

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/contact", label: "Contact" },
] as const;

function EmailLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="text-white/55 transition hover:text-white/85"
    >
      {label}
    </a>
  );
}

export function MarketingSiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-primary">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <MarketingBrandMark showSlogan={false} iconClassName="h-9 w-9" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
              iOS &amp; Android app. This site is policies and contact only.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Legal</p>
              <ul className="mt-3 space-y-2 text-sm">
                {legalLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-white/55 transition hover:text-white/85">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Email</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <EmailLink href={`mailto:${appConfig.supportEmail}`} label={appConfig.supportEmail} />
                </li>
                <li>
                  <EmailLink href={`mailto:${appConfig.contactEmail}`} label={appConfig.contactEmail} />
                </li>
                <li>
                  <EmailLink
                    href={`mailto:${appConfig.partnershipsEmail}`}
                    label={appConfig.partnershipsEmail}
                  />
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-white/[0.06] pt-6 text-center text-xs leading-relaxed text-white/35">
          © {year} {appConfig.appName}.{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-white/55">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white/55">
            Privacy
          </Link>
          {" · "}
          <Link href="/guidelines" className="underline underline-offset-2 hover:text-white/55">
            Guidelines
          </Link>
        </p>
      </div>
    </footer>
  );
}
