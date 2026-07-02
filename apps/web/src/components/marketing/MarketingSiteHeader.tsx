"use client";

import Link from "next/link";
import { IntencityBrandLockupImage } from "@/components/IntencityBrandLockupImage";

export function MarketingSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="shrink-0 transition-opacity hover:opacity-90" aria-label="Intencity home">
          <IntencityBrandLockupImage variant="auth" className="h-[2.125rem] w-auto" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
          <Link
            href="/contact"
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white sm:px-3 sm:text-sm"
          >
            Contact
          </Link>
          <Link
            href="/#download"
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/[0.14] sm:px-3 sm:text-sm"
          >
            Get the app
          </Link>
        </nav>
      </div>
    </header>
  );
}
