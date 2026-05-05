import type { ReactNode } from "react";

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
      <button
        type="button"
        onClick={onBack}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/80 transition hover:bg-white/[0.07] active:scale-[0.98]"
        aria-label="Back"
      >
        ←
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.25rem] font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] text-white/48">{subtitle}</p> : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}

/** Clears content above the fixed bottom nav on tab routes. */
export const APP_TAB_BOTTOM_PADDING_CLASS =
  "pb-[calc(env(safe-area-inset-bottom,0px)+92px)]";
