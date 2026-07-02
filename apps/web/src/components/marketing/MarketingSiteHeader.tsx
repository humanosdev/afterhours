"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MarketingBrandMark } from "@/components/marketing/MarketingBrandMark";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/contact", label: "Contact" },
] as const;

function GetAppButton({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      href="/#download"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,102,255,0.25)] transition hover:bg-accent-violet-active active:scale-[0.98] ${className}`.trim()}
    >
      Get the app
    </Link>
  );
}

export function MarketingSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-primary/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Intencity home">
            <MarketingBrandMark
              iconClassName="h-8 w-8 sm:h-9 sm:w-9"
              sloganClassName="hidden max-w-[11rem] text-[11px] leading-snug sm:block sm:max-w-none sm:text-xs"
            />
          </Link>

          <nav
            className="ml-auto hidden items-center gap-1 md:flex"
            aria-label="Site"
          >
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                {label}
              </Link>
            ))}
            <GetAppButton className="ml-2" />
          </nav>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <GetAppButton className="px-3 py-1.5 text-xs" />
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-lg text-white/80 transition hover:bg-white/[0.06] hover:text-white"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,17.5rem)] flex-col border-l border-white/[0.08] bg-primary shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
              <MarketingBrandMark
                iconClassName="h-8 w-8"
                sloganClassName="text-[11px] leading-snug"
              />
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-lg text-white/80 hover:bg-white/[0.06]"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                <X size={22} strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Mobile">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-[15px] font-medium text-white/85 transition hover:bg-white/[0.06]"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/terms"
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white/80"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white/80"
              >
                Privacy
              </Link>
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <GetAppButton className="w-full" onClick={closeMenu} />
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
