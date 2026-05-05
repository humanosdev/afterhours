"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Map, User, MessageCircle, Home, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  chatUnreadCount = 0,
}: {
  onOpenStories?: () => void;
  chatUnreadCount?: number;
}) {
  const pathname = usePathname();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(display-mode: standalone)");
    const computeStandalone = () =>
      setIsStandalone(media.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    computeStandalone();
    media.addEventListener("change", computeStandalone);
    window.addEventListener("pageshow", computeStandalone);
    return () => {
      media.removeEventListener("change", computeStandalone);
      window.removeEventListener("pageshow", computeStandalone);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAvatar = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setProfileAvatarUrl(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted) return;
      setProfileAvatarUrl((data?.avatar_url as string | null) ?? null);
    };
    loadAvatar();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <nav
      className="pointer-events-auto fixed inset-x-0 z-[10000] flex justify-center px-3 [transform:translateZ(0)]"
      style={{
        // Keep web Safari and Home Screen visually aligned while preserving safe-area.
        bottom: isStandalone
          ? "max(2.125rem, calc(env(safe-area-inset-bottom, 0px) + 0.875rem))"
          : "calc(env(safe-area-inset-bottom, 0px) + 0.375rem)",
      }}
    >
      <div className="relative isolate w-full max-w-[min(100vw-16px,360px)] rounded-2xl border border-white/[0.12] bg-black/60 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent" />
        <div className="relative z-10 mx-auto flex items-center justify-center gap-2 sm:gap-3">
        {/* LEFT SIDE */}
        <div className="flex flex-1 items-center justify-end gap-1 pr-0.5">
          {leftTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative grid h-9 w-9 place-items-center rounded-[10px] border transition-all",
                  active
                    ? "border-white/20 bg-transparent shadow-none"
                    : "border-transparent bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.08]",
                ].join(" ")}
                aria-label={label}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.25 : 2}
                  className={active ? "text-accent-violet-active" : "text-white/65"}
                />
              </Link>
            );
          })}
        </div>

        {/* CENTER MOMENTS BUTTON */}
        {onOpenStories ? (
          <button
            type="button"
            onClick={onOpenStories}
            className="group relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-accent-violet/55 bg-accent-violet/35 shadow-[0_0_22px_rgba(122,60,255,0.48)] transition active:scale-[0.98]"
            aria-label="New moment"
          >
            <Plus size={21} strokeWidth={2.5} className="text-white" />
          </button>
        ) : (
          <Link
            href="/stories"
            className="group relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-accent-violet/55 bg-accent-violet/35 shadow-[0_0_22px_rgba(122,60,255,0.48)] transition active:scale-[0.98]"
            aria-label="Open moments"
          >
            <Plus size={21} strokeWidth={2.5} className="text-white" />
          </Link>
        )}

        {/* RIGHT SIDE */}
        <div className="flex flex-1 items-center justify-start gap-1 pl-0.5">
          {rightTabs.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative grid h-9 w-9 place-items-center rounded-[10px] border transition-all",
                  label === "Profile" && profileAvatarUrl
                    ? "border-transparent bg-transparent shadow-none"
                    : active
                      ? "border-white/20 bg-transparent shadow-none"
                      : "border-transparent bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.08]",
                ].join(" ")}
                aria-label={label}
              >
                {label === "Profile" && profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileAvatarUrl}
                    alt="Profile"
                    className={[
                      "h-7 w-7 rounded-full object-cover transition-all",
                      active
                        ? "ring-2 ring-accent-violet-active ring-offset-1 ring-offset-black/70"
                        : "ring-0",
                    ].join(" ")}
                  />
                ) : (
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.25 : 2}
                    className={active ? "text-accent-violet-active" : "text-white/65"}
                  />
                )}
                {label === "Chat" && chatUnreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-accent-violet px-1 text-[10px] font-semibold text-white">
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        </div>
      </div>
    </nav>
  );
}