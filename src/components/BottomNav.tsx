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
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-subtle bg-primary shadow-[0_-10px_24px_rgba(0,0,0,0.45)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative mx-auto flex max-w-md items-center justify-between px-6 py-3">
        
        {/* LEFT SIDE */}
        <div className="flex items-center gap-5">
          {leftTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative grid h-12 w-12 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-accent-violet/40 bg-accent-violet/15 shadow-glow-violet"
                    : "border-transparent hover:border-subtle hover:bg-surface/70",
                ].join(" ")}
                aria-label={label}
              >
                <Icon
                  size={22}
                  className={active ? "text-accent-violet-active" : "text-text-secondary"}
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

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-5">
          {rightTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "grid h-12 w-12 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-accent-violet/40 bg-accent-violet/15 shadow-glow-violet"
                    : "border-transparent hover:border-subtle hover:bg-surface/70",
                ].join(" ")}
                aria-label={label}
              >
                <Icon
                  size={22}
                  className={active ? "text-accent-violet-active" : "text-text-secondary"}
                />
              </Link>
            );
          })}
        </div>

        {/* 🔥 CENTER STORIES BUTTON */}
        {onOpenStories ? (
          <button
            type="button"
            onClick={onOpenStories}
            className="absolute left-1/2 -translate-x-1/2 -top-7"
            aria-label="New story"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-violet shadow-glow-violet">
              <Plus size={28} className="text-text-primary" />
            </div>
          </button>
        ) : (
          <Link
            href="/stories"
            className="absolute left-1/2 -translate-x-1/2 -top-7"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-violet shadow-glow-violet">
              <Plus size={28} className="text-text-primary" />
            </div>
          </Link>
        )}

      </div>
    </nav>
  );
}