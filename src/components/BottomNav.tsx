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
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
    >
      <div className="relative w-full max-w-md rounded-[28px] border border-white/15 bg-black/55 px-5 py-3.5 shadow-[0_12px_42px_rgba(0,0,0,0.48)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/[0.08] to-transparent" />
        <div className="relative mx-auto flex items-center justify-between">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3">
          {leftTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative grid h-12 w-12 place-items-center rounded-2xl border transition-all",
                  active
                    ? "border-white/25 bg-transparent shadow-none"
                    : "border-transparent bg-white/[0.03] hover:border-white/20 hover:bg-white/10",
                ].join(" ")}
                aria-label={label}
              >
                <Icon
                  size={22}
                  className={active ? "text-violet-100" : "text-white/70"}
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
            className="group relative mx-1.5 shrink-0 rounded-2xl border border-violet-300/50 bg-violet-500/20 p-3.5 shadow-[0_0_26px_rgba(168,85,247,0.42)] transition-transform hover:scale-[1.03]"
            aria-label="New moment"
          >
            <Plus size={24} className="text-violet-50" />
          </button>
        ) : (
          <Link
            href="/stories"
            className="group relative mx-1.5 shrink-0 rounded-2xl border border-violet-300/50 bg-violet-500/20 p-3.5 shadow-[0_0_26px_rgba(168,85,247,0.42)] transition-transform hover:scale-[1.03]"
            aria-label="Open moments"
          >
            <Plus size={24} className="text-violet-50" />
          </Link>
        )}

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {rightTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "grid h-12 w-12 place-items-center rounded-2xl border transition-all",
                  active
                    ? "border-white/25 bg-transparent shadow-none"
                    : "border-transparent bg-white/[0.03] hover:border-white/20 hover:bg-white/10",
                ].join(" ")}
                aria-label={label}
              >
                <Icon
                  size={22}
                  className={active ? "text-violet-100" : "text-white/70"}
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