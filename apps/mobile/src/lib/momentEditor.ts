export type MomentTextFontId = "classic" | "serif" | "mono" | "rounded" | "script";

export type MomentTextFont = {
  id: MomentTextFontId;
  label: string;
  /** Default text shown when you tap this font on the moment. */
  previewText: string;
  fontFamily: string;
  fontWeight: "400" | "600" | "700" | "800";
  color: string;
};

export const MOMENT_TEXT_FONTS: MomentTextFont[] = [
  {
    id: "classic",
    label: "Classic",
    previewText: "Classic",
    fontFamily: "System",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  {
    id: "serif",
    label: "Serif",
    previewText: "Serif",
    fontFamily: "Georgia",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  {
    id: "mono",
    label: "Mono",
    previewText: "Mono",
    fontFamily: "Courier",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  {
    id: "rounded",
    label: "Round",
    previewText: "Round",
    fontFamily: "AvenirNext-DemiBold",
    fontWeight: "600",
    color: "#FFFFFF",
  },
  {
    id: "script",
    label: "Script",
    previewText: "Script",
    fontFamily: "SnellRoundhand-Bold",
    fontWeight: "700",
    color: "#FFFFFF",
  },
];

export type MomentOverlayBase = {
  id: string;
  /** Normalized center X in the preview frame (0–1). */
  x: number;
  /** Normalized center Y in the preview frame (0–1). */
  y: number;
  /** Scale relative to frame width (1 ≈ 34% of frame). */
  scale: number;
};

export type MomentStickerBadgeStyle = {
  text: string;
  backgroundColor: string;
  color: string;
  borderColor?: string;
  fontFamily?: string;
  fontWeight?: "700" | "800" | "900";
  /** Degrees — slight tilt reads more sticker-like. */
  rotation?: number;
};

export type MomentStickerOverlay = MomentOverlayBase & {
  kind: "sticker";
  uri?: string;
  assetId?: string;
  badge?: MomentStickerBadgeStyle;
  emojiGlyph?: string;
};

export type MomentEmojiOverlay = MomentOverlayBase & {
  kind: "emoji";
  emoji: string;
};

export type MomentTextOverlay = MomentOverlayBase & {
  kind: "text";
  text: string;
  fontId: MomentTextFontId;
};

export type MomentOverlay = MomentStickerOverlay | MomentEmojiOverlay | MomentTextOverlay;

/** Device library sticker or built-in pack item. */
export type MomentStickerItem = {
  id: string;
  assetId?: string;
  uri: string | null;
  width: number;
  height: number;
  kind: "sticker";
  source: "device" | "builtin";
  packId: string;
  packName: string;
  tags: string[];
  badge?: MomentStickerBadgeStyle;
  emojiGlyph?: string;
};

export function momentFontById(id: MomentTextFontId): MomentTextFont {
  return MOMENT_TEXT_FONTS.find((f) => f.id === id) ?? MOMENT_TEXT_FONTS[0];
}

export function newOverlayId(): string {
  return `ov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultOverlayPosition(): Pick<MomentOverlayBase, "x" | "y" | "scale"> {
  return { x: 0.5, y: 0.72, scale: 1 };
}
