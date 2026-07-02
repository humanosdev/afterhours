import type { EdgeInsets } from "react-native-safe-area-context";

/**
 * Token-for-token from web `BottomNav.tsx` + `.ah-glass-control` (`globals.css`).
 *
 * Nav host: `px-3`, `bottom: calc(safe-area + max(2px, 0.125rem))`.
 * Bar: `max-w-[min(100vw-16px,360px)]`, `rounded-2xl` (1.15rem), `px-2 py-1.5`.
 * Wells `h-9 w-9 rounded-[10px]`; create `h-10 w-10`; avatar `h-7 w-7`.
 */
export const tabBarMetrics = {
  hostPaddingX: 12,
  barWidthCap: 360,
  barWidthViewportMargin: 16,
  barPaddingX: 8,
  barPaddingY: 6,
  /** `rounded-2xl` → 1.15rem */
  barRadius: 18.4,
  rowGap: 8,
  sideTabGap: 4,
  sideInsetTowardCenter: 2,
  iconWellSize: 36,
  iconWellRadius: 10,
  profileAvatarSize: 28,
  profileRingWidth: 2,
  profileRingOffset: 1,
  createSize: 40,
  createRadius: 10,
  hostBottomExtra: 2,
  zIndex: 10150,
} as const;

export function tabBarBarWidth(screenWidth: number): number {
  return Math.min(screenWidth - tabBarMetrics.barWidthViewportMargin, tabBarMetrics.barWidthCap);
}

/** Bar chrome height excluding safe area (icon row + vertical padding). */
export function tabBarChromeHeight(): number {
  return tabBarMetrics.barPaddingY * 2 + tabBarMetrics.createSize;
}

export function tabBarBottomOffset(insets: EdgeInsets): number {
  return Math.max(insets.bottom, 0) + tabBarMetrics.hostBottomExtra;
}

/** Scroll/content padding when the floating tab bar is visible. */
export function tabBarScrollInset(insets: EdgeInsets): number {
  return tabBarChromeHeight() + tabBarBottomOffset(insets) + 8;
}

/** Sheet/list padding above home indicator when tab bar is hidden. */
export function safeAreaBottomInset(insets: EdgeInsets): number {
  return Math.max(insets.bottom, 8);
}

/**
 * Visual gap between floating tab bar top and checkpoint bar bottom.
 * PWA CSS uses `bottom: safe-area + 124px` with checkpoint z-index above nav — perceived gap is ~10–12px, not 70px empty.
 * Also used below the status bar before category / Locate / Friends / Ghost (symmetric map chrome).
 */
/** Visual gap between floating tab bar top and checkpoint bar bottom. */
export const MAP_CHECKPOINT_GAP_ABOVE_NAV_PX = 10;

/** PWA `top-[calc(env(safe-area-inset-top)+30px)]` on map overlay column. */
export const MAP_TOP_OVERLAY_GAP_PX = 30;

/**
 * Collapsed map chrome column — category tray + Locate/Friends + Ghost row.
 * Reserves height so venue error copy does not shift controls on cold open.
 */
export const MAP_TOP_OVERLAY_COLUMN_MIN_HEIGHT = 124;

/** Top overlay inset — category tray / Locate / Friends. */
export function mapTopOverlayPaddingTop(insets: EdgeInsets): number {
  return Math.max(insets.top, 0) + MAP_TOP_OVERLAY_GAP_PX;
}

/** Web literal `MAP_NAV_CLEARANCE_PX` (for docs); native positions by visual gap above tab chrome. */
export const MAP_NAV_CLEARANCE_PX =
  tabBarMetrics.hostBottomExtra + tabBarChromeHeight() + MAP_CHECKPOINT_GAP_ABOVE_NAV_PX;

/** Bottom offset for checkpoint swiper bar bottom edge (PWA portals bar only — no browse affordance below). */
export function mapCheckpointBarBottom(insets: EdgeInsets): number {
  return tabBarBottomOffset(insets) + tabBarChromeHeight() + MAP_CHECKPOINT_GAP_ABOVE_NAV_PX;
}
