import type { EdgeInsets } from "react-native-safe-area-context";
import { composerChrome } from "./composerLayout";

/** IG-style moment stage — full-width rounded cutout + black bottom dock. */
export type MomentStageMetrics = {
  width: number;
  height: number;
  left: number;
  top: number;
  borderRadius: number;
  bottomDockHeight: number;
};

/** Viewer footer — matches `StoryViewerModal` reply row + padding (safe area included once). */
export function storyViewerFooterBandHeight(insets: EdgeInsets): number {
  return 12 + 44 + Math.max(insets.bottom, 12) + 8;
}

function buildMomentStageMetrics(
  windowWidth: number,
  windowHeight: number,
  top: number,
  bottomDockHeight: number
): MomentStageMetrics {
  const height = Math.max(0, windowHeight - top - bottomDockHeight);

  return {
    width: windowWidth,
    height,
    left: 0,
    top,
    borderRadius: composerChrome.momentCutoutRadius,
    bottomDockHeight,
  };
}

/**
 * Composer — IG camera: preview fills between status bar and mode menu.
 * Top bar + capture row overlay the cutout; only the mode menu sits below it.
 */
export function momentStageMetrics(
  windowWidth: number,
  windowHeight: number,
  insets: EdgeInsets
): MomentStageMetrics {
  return buildMomentStageMetrics(
    windowWidth,
    windowHeight,
    insets.top + 8,
    insets.bottom + composerChrome.modeMenuHeight + composerChrome.modeMenuGap + 4
  );
}

/**
 * Story viewer — same tall IG cutout as composer (WYSIWYG with poster).
 * Progress + identity overlay the top of the cutout; reply bar sits below it.
 */
export function momentViewerStageMetrics(
  windowWidth: number,
  windowHeight: number,
  insets: EdgeInsets
): MomentStageMetrics {
  return buildMomentStageMetrics(
    windowWidth,
    windowHeight,
    insets.top + 2,
    storyViewerFooterBandHeight(insets)
  );
}

/** Publish capture size — 9:16 JPEG (backdrop / view-shot path). */
export const MOMENT_PUBLISH_WIDTH = 1080;
export const MOMENT_PUBLISH_HEIGHT = 1920;
