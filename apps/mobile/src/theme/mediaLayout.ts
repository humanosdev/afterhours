import { Dimensions, StyleSheet, type ViewStyle } from "react-native";
import { shareAspectRatio, type ShareAspectFormat } from "../lib/shareAspect";
import { layout } from "./layout";
import { motion, mediaPlaceholderColor } from "./motion";

/** Canonical aspect class IDs — see docs/INTENCITY_MEDIA_DOCTRINE.md */
export type MediaLayoutClass =
  | "FULLSCREEN_IMMERSIVE"
  | "SHARE_FEED_DISPLAY"
  | "SHARE_DETAIL"
  | "VERTICAL_STORY"
  | "SQUARE_GRID"
  | "VENUE_CARD"
  | "VENUE_HERO";

/** Single source for native media geometry, ingest constants, and skeleton parity. */
export const mediaLayout = {
  placeholderColor: mediaPlaceholderColor,
  transitionMs: motion.fade.image,

  ingest: {
    /** Lossless JPEG re-encode where supported — avoid visible compression on camera/library. */
    jpegQuality: 1,
    pickerQuality: 1,
    /** Cap only very large library imports; device camera frames stay at native resolution. */
    maxLongEdge: 4096,
    /** 9:16 moment export — full phone resolution (long edge). */
    momentPublishLongEdge: 3840,
  },

  aspect: {
    verticalStory: 9 / 16,
    shareFeed: 4 / 5,
    squareGrid: 1,
    venueCard: 5 / 6,
  },

  /** @deprecated Pre–IG crop hub cap; use `shareFeedDisplayFrameStyle` aspectRatio instead. */
  shareFeedDisplay: {
    widthRatio: 0.52,
    maxHeight: 280,
  },

  shareDetail: {
    aspectRatio: 4 / 5,
    maxHeight: 640,
  },

  verticalStoryPreview: {
    aspectRatio: 9 / 16,
    maxWidthFraction: 1,
  },

  venueHero: {
    height: 168,
  },

  grid: {
    cellWidthPercent: "32.5%" as const,
    aspectRatio: 1,
    gap: 2,
  },

  feedMediaRadius: 2,

  /** Hub share card rhythm — mirrors PWA `HubShareFeedCard` spacing (execution only). */
  hubShareArticle: {
    paddingBottom: 40,
    lastPaddingBottom: 16,
    headerGap: 10,
    headerPaddingBottom: 10,
    actionsMarginTop: 12,
    likedByMarginTop: 8,
    previewsMarginTop: 12,
    previewsGap: 12,
    timestampMarginTop: 8,
  },

  avatar: {
    tab: 28,
    feedHeader: 36,
    chatList: 56,
    chatThread: 40,
    comments: 40,
    commentsComposer: 32,
    notifications: 36,
    discovery: 44,
    profileHeader: 80,
  },
} as const;

/** @deprecated Use `hubShareDisplayHeight` with share aspect. */
export function hubShareMediaHeight(windowWidth = Dimensions.get("window").width): number {
  return hubShareDisplayHeight(windowWidth, "portrait");
}

/** Hub share media height from full-bleed width + IG aspect (4:5 or 1:1). */
export function hubShareDisplayHeight(
  windowWidth = Dimensions.get("window").width,
  format: ShareAspectFormat = "portrait"
): number {
  return Math.round(windowWidth / shareAspectRatio(format));
}

/** Crop window size inside composer (inset like IG). */
export function shareCropWindowSize(
  windowWidth = Dimensions.get("window").width,
  format: ShareAspectFormat = "portrait"
): { width: number; height: number } {
  const width = windowWidth;
  const height = hubShareDisplayHeight(width, format);
  return { width, height };
}

/** IG new-post preview band — caps height so the Recents grid gets ~half the sheet. */
export function shareComposerPreviewHeight(
  windowHeight: number,
  windowWidth: number,
  format: ShareAspectFormat,
  topInset: number,
  bottomInset: number
): number {
  const crop = shareCropWindowSize(windowWidth, format);
  const headerH = topInset + 54;
  const albumH = 40;
  const available = Math.max(0, windowHeight - headerH - albumH - bottomInset);
  const igSplit = Math.round(available * 0.48);
  return Math.min(crop.height, Math.max(200, igSplit));
}

/** Scroll distance to fully collapse preview + reveal full-screen grid (IG). */
export function shareComposerHeaderScrollHeight(previewHeight: number): number {
  return previewHeight + 40;
}

/** Square profile avatar crop — centered in screen. */
export function avatarCropWindowSize(windowWidth = Dimensions.get("window").width): {
  width: number;
  height: number;
} {
  const size = Math.min(windowWidth - 48, 320);
  return { width: size, height: size };
}

/** Hub share card — full width, fixed IG aspect (not photo-native crop). */
export function shareFeedDisplayFrameStyle(
  windowWidth = Dimensions.get("window").width,
  format: ShareAspectFormat = "portrait"
): ViewStyle {
  return {
    width: windowWidth,
    aspectRatio: shareAspectRatio(format),
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: mediaLayout.feedMediaRadius,
    backgroundColor: mediaLayout.placeholderColor,
  };
}

/** Composer WYSIWYG — same frame as hub feed. */
export function shareFeedPreviewFrameStyle(
  windowWidth = Dimensions.get("window").width,
  format: ShareAspectFormat = "portrait"
): ViewStyle {
  return shareFeedDisplayFrameStyle(windowWidth, format);
}

/** Moment / story viewer & detail — 9:16 WYSIWYG (matches composer STORY frame). */
export function momentStoryFrameStyle(windowWidth = Dimensions.get("window").width): ViewStyle {
  return {
    width: windowWidth,
    aspectRatio: mediaLayout.aspect.verticalStory,
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
  };
}

/** Share post detail — same aspect as hub feed (portrait 4:5 or square 1:1). */
export function shareDetailMediaFrameStyle(
  windowWidth = Dimensions.get("window").width,
  format: ShareAspectFormat = "portrait"
): ViewStyle {
  return {
    ...shareFeedDisplayFrameStyle(windowWidth, format),
    maxWidth: layout.contentMaxWidth,
    borderRadius: layout.cardRadius,
  };
}

/** Full-bleed share in viewer — same width + aspect as hub feed (WYSIWYG). */
export function shareViewerFeedFrameMetrics(
  windowWidth: number,
  windowHeight: number,
  format: ShareAspectFormat = "portrait",
  topReserved = 108
): { width: number; height: number; left: number; top: number } {
  const width = windowWidth;
  const height = hubShareDisplayHeight(windowWidth, format);
  const availH = Math.max(0, windowHeight - topReserved - 132);
  const top = topReserved + Math.max(0, Math.round((availH - height) / 2));
  return { width, height, left: 0, top };
}

/** Centered viewer frame metrics — letterboxed 9:16 moment or IG share aspect. */
export function storyViewerFrameMetrics(
  windowWidth: number,
  windowHeight: number,
  opts: { isShare: boolean; shareAspect?: ShareAspectFormat }
): { width: number; height: number; left: number; top: number } {
  const aspect = opts.isShare
    ? shareAspectRatio(opts.shareAspect ?? "portrait")
    : mediaLayout.aspect.verticalStory;
  const topReserved = 108;
  const bottomReserved = 132;
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

export function verticalStoryPreviewFrameStyle(): ViewStyle {
  return {
    width: "100%",
    maxHeight: "100%",
    aspectRatio: mediaLayout.verticalStoryPreview.aspectRatio,
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
  };
}

export function squareGridCellStyle(): ViewStyle {
  return {
    width: mediaLayout.grid.cellWidthPercent,
    aspectRatio: mediaLayout.grid.aspectRatio,
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
  };
}

/** Explicit 3-column profile grid cell — % width + aspectRatio can collapse to 0h in RN flexWrap. */
export function profileGridCellSize(windowWidth = Dimensions.get("window").width): number {
  const inner = Math.min(windowWidth, layout.contentMaxWidth + layout.screenPaddingX * 2) - layout.screenPaddingX * 2;
  const gap = mediaLayout.grid.gap;
  return Math.floor((inner - gap * 2) / 3);
}

/** Image fill inside an existing `squareGridCellStyle` pressable — not a nested 32.5% frame. */
export function squareGridCellFillStyle(): ViewStyle {
  return StyleSheet.absoluteFillObject;
}

export function venueCardFrameStyle(cardWidth: number): ViewStyle {
  return {
    width: cardWidth,
    aspectRatio: mediaLayout.aspect.venueCard,
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
  };
}

export function venueHeroFrameStyle(): ViewStyle {
  return {
    width: "100%",
    height: mediaLayout.venueHero.height,
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
  };
}

export function fullscreenMediaStyle(): ViewStyle {
  return StyleSheet.absoluteFillObject;
}

/** Map layout class → default contentFit */
export function defaultContentFitForClass(layoutClass: MediaLayoutClass): "cover" | "contain" {
  return "cover";
}
