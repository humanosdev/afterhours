import type { ReactNode } from "react";

/** Same chrome as {@link AppSubpageHeader} back control — use everywhere for consistent subpage navigation. */
export function SubpageBackButton({
  onBack,
  className = "",
  ariaLabel = "Back",
}: {
  onBack: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`ah-glass-control ah-glass-control-interactive grid h-10 w-10 shrink-0 place-items-center rounded-full text-[17px] text-white/80 active:scale-[0.98] ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <span className="relative z-[1]">←</span>
    </button>
  );
}

/** Prefer `router.back()` when history exists; otherwise `router.push(fallbackHref)`. */
export function navigateBack(
  router: { back: () => void; push: (href: string) => void },
  fallbackHref: string
) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallbackHref);
  }
}

/**
 * Shared chrome for in-app subpages (settings leaf routes, lists, etc.):
 * back control + title stack aligned with main Settings / Notifications headers.
 */
export function AppSubpageHeader({
  title,
  subtitle,
  onBack,
  rightSlot,
  className = "",
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightSlot?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 border-b border-white/[0.08] pb-3 ${className}`.trim()}>
      <SubpageBackButton onBack={onBack} />
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.25rem] font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] text-white/48">{subtitle}</p> : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}

export {
  APP_PAGE_TAIL_PADDING_CLASS as APP_TAB_BOTTOM_PADDING_CLASS,
} from "@/lib/appShellLayout";
