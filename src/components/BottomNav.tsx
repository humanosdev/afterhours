"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, User, MessageCircle, Home, Plus } from "lucide-react";

const leftTabs = [
  { href: "/hub", label: "Hub", Icon: Home },
  { href: "/map", label: "Map", Icon: Map },
];

const rightTabs = [
  { href: "/chat", label: "Chat", Icon: MessageCircle },
  { href: "/profile", label: "Profile", Icon: User },
];

export default function BottomNav({
  onOpenStories,
  unreadCount = 0,
}: {
  onOpenStories?: () => void;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 z-[60] flex justify-center px-3"
      style={{
        // Safe area + gap above home swipe; min ~34px when env() is 0 (e.g. missing viewport-fit).
        bottom: "max(2.125rem, calc(env(safe-area-inset-bottom, 0px) + 0.875rem))",
      }}
    >
      <div className="relative w-full max-w-[min(100vw-20px,400px)] rounded-2xl border border-white/[0.12] bg-black/60 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent" />
        <div className="relative mx-auto flex items-center justify-between">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-1.5">
          {leftTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative grid h-10 w-10 place-items-center rounded-xl border transition-all",
                  active
                    ? "border-white/20 bg-transparent shadow-none"
                    : "border-transparent bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.08]",
                ].join(" ")}
                aria-label={label}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.25 : 2}
                  className={active ? "text-violet-200" : "text-white/65"}
                />
                {label === "Profile" && unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* CENTER MOMENTS BUTTON */}
        {onOpenStories ? (
          <button
            type="button"
            onClick={onOpenStories}
            className="group relative mx-1 shrink-0 grid h-11 w-11 place-items-center rounded-xl border border-violet-400/45 bg-gradient-to-b from-violet-500/35 to-violet-600/25 shadow-[0_0_22px_rgba(168,85,247,0.45)] transition active:scale-[0.98]"
            aria-label="New moment"
          >
            <Plus size={22} strokeWidth={2.5} className="text-violet-50" />
          </button>
        ) : (
          <Link
            href="/stories"
            className="group relative mx-1 shrink-0 grid h-11 w-11 place-items-center rounded-xl border border-violet-400/45 bg-gradient-to-b from-violet-500/35 to-violet-600/25 shadow-[0_0_22px_rgba(168,85,247,0.45)] transition active:scale-[0.98]"
            aria-label="Open moments"
          >
            <Plus size={22} strokeWidth={2.5} className="text-violet-50" />
          </Link>
        )}

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-1.5">
          {rightTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "grid h-10 w-10 place-items-center rounded-xl border transition-all",
                  active
                    ? "border-white/20 bg-transparent shadow-none"
                    : "border-transparent bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.08]",
                ].join(" ")}
                aria-label={label}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.25 : 2}
                  className={active ? "text-violet-200" : "text-white/65"}
                />
              </Link>
            );
          })}
        </div>
        </div>
      </div>
    </nav>
  );
}