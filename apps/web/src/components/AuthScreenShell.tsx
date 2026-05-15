import type { ReactNode } from "react";

function shellPad(marketing: boolean, marketingScroll: boolean) {
  return marketing || marketingScroll ? "px-3 sm:px-6" : "px-6";
}

function baseClass(marketing: boolean, marketingScroll: boolean) {
  return (
    `flex min-h-[100dvh] w-full max-w-none flex-col bg-primary text-text-primary ${shellPad(marketing, marketingScroll)} ` +
    "pt-[calc(env(safe-area-inset-top,0px)+28px)] " +
    "pb-[max(env(safe-area-inset-bottom,0px),28px)]"
  );
}

/**
 * Login / signup / password flows: full canvas (`bg-primary` charcoal), dynamic viewport height,
 * and safe-area padding so content clears the iPhone status bar and home indicator without extra chrome.
 */
export function AuthScreenShell({
  children,
  centered,
  /** Login/signup: centered column (`max-w-2xl` so full lockup + tagline can scale up). */
  marketing,
  /** Long marketing pages (e.g. home landing): scroll naturally without vertical lock. */
  marketingScroll,
  className = "",
}: {
  children: ReactNode;
  /** Vertically center content (e.g. username onboarding) while keeping safe-area insets. */
  centered?: boolean;
  marketing?: boolean;
  marketingScroll?: boolean;
  className?: string;
}) {
  if (marketing && marketingScroll) {
    return (
      <div className={`${baseClass(true, true)} relative ${className}`.trim()}>
        <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col py-1">{children}</div>
      </div>
    );
  }

  if (marketingScroll) {
    return (
      <div className={`${baseClass(false, true)} relative ${className}`.trim()}>
        <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col py-1">{children}</div>
      </div>
    );
  }

  if (marketing) {
    return (
      <div
        className={`${baseClass(true, false)} relative items-center ${className}`.trim()}
      >
        {/*
          `my-auto` avoids flex-1 + justify-center recalculating when fonts/content settle (reduces tiny vertical nudge).
        */}
        <div className="relative z-[1] my-auto flex w-full max-w-2xl flex-col py-1">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`${baseClass(false, false)} relative${centered ? " justify-center" : ""}${className ? ` ${className}` : ""}`.trim()}
    >
      <div className="relative z-[1] w-full">{children}</div>
    </div>
  );
}
