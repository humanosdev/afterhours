import type { ShareAspectFormat } from "../lib/shareAspect";
import { shareAspectRatio } from "../lib/shareAspect";
import type { ComposerMode } from "../lib/uploadStoryMediaTypes";

/** Viewport aspect inside the composer — WYSIWYG for published surface. */
export function composerViewportAspect(
  mode: ComposerMode,
  shareFormat: ShareAspectFormat = "portrait"
): number {
  if (mode === "shares") return shareAspectRatio(shareFormat);
  return 9 / 16;
}

export type ComposerFrameMetrics = {
  width: number;
  height: number;
  left: number;
  top: number;
};

/** Centered story/post frame between top chrome and bottom controls. */
export function composerFrameMetrics(opts: {
  windowWidth: number;
  windowHeight: number;
  topReserved: number;
  bottomReserved: number;
  aspect: number;
}): ComposerFrameMetrics {
  const { windowWidth, windowHeight, topReserved, bottomReserved, aspect } = opts;
  const availH = Math.max(0, windowHeight - topReserved - bottomReserved);
  const availW = windowWidth;

  let width = availW;
  let height = width / aspect;
  if (height > availH) {
    height = availH;
    width = height * aspect;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    left: Math.round((availW - width) / 2),
    top: topReserved + Math.round((availH - height) / 2),
  };
}

/** IG camera chrome rhythm (px). */
export const composerChrome = {
  topBarHeight: 52,
  leftRailWidth: 56,
  captureRowHeight: 96,
  modeMenuHeight: 44,
  modeMenuGap: 10,
  frameRadius: 8,
  momentCutoutRadius: 14,
  shutterOuter: 78,
  shutterInner: 56,
  gallerySize: 40,
  flipSize: 40,
} as const;
