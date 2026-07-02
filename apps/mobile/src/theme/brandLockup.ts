import { Dimensions } from "react-native";
import { layout } from "./layout";

/** Matches web `INTENCITY_BRAND_LOCKUP_*` — 1024×576 master art. */
export const BRAND_LOCKUP_ASPECT = 576 / 1024;

export const BRAND_LOCKUP_INTRINSIC = {
  width: 1024,
  height: 576,
} as const;

/**
 * Viewport-bounded lockup size — mirrors web `IntencityBrandLockupImage` `auth` / `splash` caps.
 * Width-first `object-contain` logic; height cap prevents overflow on short phones.
 */
export function brandLockupDimensions(
  variant: "auth" | "splash",
  windowWidth = Dimensions.get("window").width,
  windowHeight = Dimensions.get("window").height,
  options?: { compact?: boolean }
) {
  const horizontalPad = layout.authPaddingX * 2;
  const compact = options?.compact ?? (variant === "auth" && windowHeight < 780);
  const maxWidth =
    variant === "splash" ? Math.min(windowWidth * 0.98, 768) : Math.min(windowWidth * 0.98, 704);
  const maxHeight =
    variant === "splash"
      ? Math.min(windowHeight * 0.76, 768)
      : compact
        ? Math.min(windowHeight * 0.36, 380)
        : Math.min(windowHeight * 0.38, 420);

  let width = Math.min(maxWidth, windowWidth - horizontalPad);
  let height = width * BRAND_LOCKUP_ASPECT;
  if (height > maxHeight) {
    height = maxHeight;
    width = height / BRAND_LOCKUP_ASPECT;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/** Auth/marketing rhythm — aligned with web `mb-8` / `mt-8` / `mb-4`. */
export const authBrandSpacing = {
  lockupMarginBottom: 24,
  titleToFormGap: 24,
  backMarginBottom: 12,
} as const;
