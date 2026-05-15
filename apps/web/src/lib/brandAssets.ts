/**
 * Splash / auth lockup (`public/intencity-splash-lockup.png`).
 * Master art ~16:9; intrinsic `width`/`height` avoid layout shift while CSS scales for viewport.
 *
 * `?v=` busts caches when the bitmap is re-matted to match `--ah-bg-primary-rgb` (Safari / PWA are sticky).
 */
export const INTENCITY_BRAND_LOCKUP_ASSET_VERSION = "3";
export const INTENCITY_BRAND_LOCKUP_PATH = "/intencity-splash-lockup.png";
export const INTENCITY_BRAND_LOCKUP_SRC = `${INTENCITY_BRAND_LOCKUP_PATH}?v=${INTENCITY_BRAND_LOCKUP_ASSET_VERSION}`;
export const INTENCITY_BRAND_LOCKUP_WIDTH = 1024;
export const INTENCITY_BRAND_LOCKUP_HEIGHT = 576;
