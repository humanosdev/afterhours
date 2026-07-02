"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { LegalSection } from "@/content/legalCopy";
import { MarketingSiteShell } from "./MarketingSiteShell";

type MarketingDocumentPageProps = {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  sections: LegalSection[];
};

function formatLegalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function MarketingDocumentPage({
  title,
  subtitle,
  lastUpdated,
  sections,
}: MarketingDocumentPageProps) {
  return (
    <MarketingSiteShell>
      <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 rounded-lg py-1 text-sm font-medium text-white/55 transition hover:text-white/85"
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
          Home
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">{title}</h1>
        {lastUpdated ? (
          <p className="mt-3 text-sm text-white/50">Last updated: {formatLegalDate(lastUpdated)}</p>
        ) : null}
        {subtitle ? <p className="mt-2 text-sm text-white/55">{subtitle}</p> : null}

        <div className="mt-10 space-y-8">
          {sections.map((section, i) => (
            <section key={i}>
              {section.heading ? (
                <h2 className="mb-2 text-sm font-semibold text-white">{section.heading}</h2>
              ) : null}
              <div className="space-y-3 text-sm leading-relaxed text-white/85">
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </MarketingSiteShell>
  );
}
