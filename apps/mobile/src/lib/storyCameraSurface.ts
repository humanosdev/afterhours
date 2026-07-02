/**
 * Canonical camera surface — mutually exclusive render layers.
 * Prevents "Camera unavailable" copy over an active live feed.
 */
export type StoryCameraSurface =
  | "live"
  | "unavailable"
  | "preview"
  | "share-library";
