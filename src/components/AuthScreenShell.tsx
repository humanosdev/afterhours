import type { ReactNode } from "react";

const baseClass =
  "flex min-h-[100dvh] w-full max-w-none flex-col bg-primary text-text-primary px-6 " +
  "pt-[calc(env(safe-area-inset-top,0px)+28px)] " +
  "pb-[max(env(safe-area-inset-bottom,0px),28px)]";

/** Bottom violet wash — shared by login, signup, password flows, onboarding sub-pages, and settings that use this shell. */
const violetUnderglow = (
  <div
    className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[min(52vh,30rem)] bg-gradient-to-t from-accent-violet/35 via-accent-violet/10 to-transparent"
    aria-hidden
  />
);

/**
 * Login / signup / password flows: full black canvas (#000 via `bg-primary`), dynamic viewport height,
 * and safe-area padding so content clears the iPhone status bar and home indicator without extra chrome.
 */
export function AuthScreenShell({
  children,
  centered,
  /** Login/signup: centered column + bottom violet glow (mobile-first `max-w-sm` column). */
  marketing,
  className = "",
}: {
  children: ReactNode;
  /** Vertically center content (e.g. username onboarding) while keeping safe-area insets. */
  centered?: boolean;
  marketing?: boolean;
  className?: string;
}) {
  if (marketing) {
    return (
      <div
        className={`${baseClass} relative items-center ${className}`.trim()}
      >
        {violetUnderglow}
        {/*
          `my-auto` avoids flex-1 + justify-center recalculating when fonts/content settle (reduces tiny vertical nudge).
        */}
        <div className="relative z-[1] my-auto flex w-full max-w-sm flex-col py-1">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`${baseClass} relative${centered ? " justify-center" : ""}${className ? ` ${className}` : ""}`.trim()}
    >
      {violetUnderglow}
      <div className="relative z-[1] w-full">{children}</div>
    </div>
  );
}
