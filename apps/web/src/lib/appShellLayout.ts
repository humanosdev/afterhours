/**
 * Shared layout class strings for tab pages (content width, safe top inset, scroll tail padding).
 */

/** Default tail on tab pages (space above the fixed tab bar). */
export const APP_PAGE_TAIL_PADDING_CLASS = "pb-8";

/** Hub / dense horizontal strips — reserve a bit less than default; shell also adds bottom padding for the tab bar. */
export const APP_PAGE_TAIL_PADDING_HUB_CLASS = "pb-6 sm:pb-8";

/** Same nested scroll + overscroll behavior as hub/profile (iOS-friendly). */
export const APP_TAB_PRIMARY_SCROLL_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]";

/** Standard content column width (phone → small desktop). */
export const APP_CONTENT_MAX_CLASS =
  "mx-auto w-full max-w-[min(100%,28rem)] sm:max-w-[30rem] lg:max-w-[32rem]";

/** Safe top inset for headers under status bar / Dynamic Island. */
export const APP_PAGE_TOP_PADDING_CLASS = "pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:pt-3";

/**
 * Root wrapper for main tab routes inside {@link AppShell}.
 * Avoid stacking `min-h-[100dvh]` here with the shell’s own height — it breaks nested scroll on some tabs.
 */
export const APP_TAB_PAGE_ROOT_CLASS =
  "flex min-h-0 w-full flex-1 flex-col bg-primary";

/** Hub fires `ah-hub-feed-ready`; other tabs call {@link emitPrimarySurfaceReady} after skeleton work. */
export const AH_PRIMARY_SURFACE_READY_EVENT = "ah-primary-surface-ready";

export function emitPrimarySurfaceReady() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AH_PRIMARY_SURFACE_READY_EVENT));
}
