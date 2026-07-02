import type { MomentStickerBadgeStyle, MomentStickerItem } from "./momentEditor";

export type MomentStickerPack = {
  id: string;
  name: string;
  ageGate?: "21+";
  description: string;
};

export const MOMENT_STICKER_PACKS: MomentStickerPack[] = [
  {
    id: "after-hours",
    name: "After Hours",
    ageGate: "21+",
    description: "Dark humor, bad decisions, emotionally unhinged.",
  },
  {
    id: "vibes",
    name: "Vibes",
    description: "Internet-brained one-liners.",
  },
];

/** One word per line — avoids mid-word wraps in tiny sticker cells. */
function stickerLines(...words: string[]): string {
  return words.join("\n");
}

function badge(
  id: string,
  packId: string,
  packName: string,
  text: string,
  style: Omit<MomentStickerBadgeStyle, "text">,
  tags: string[]
): MomentStickerItem {
  return {
    id: `builtin:${id}`,
    uri: null,
    width: 512,
    height: 512,
    kind: "sticker",
    source: "builtin",
    packId,
    packName,
    tags: [text.toLowerCase(), ...tags],
    badge: { text, ...style },
  };
}

const AFTER_HOURS_STYLE: Omit<MomentStickerBadgeStyle, "text"> = {
  backgroundColor: "#12080f",
  color: "#ff4d6d",
  borderColor: "#ff4d6d",
  fontWeight: "800",
  rotation: -4,
};

const AFTER_HOURS_ALT: Omit<MomentStickerBadgeStyle, "text"> = {
  backgroundColor: "#1a1020",
  color: "#f5f0ff",
  borderColor: "#7c3aed",
  fontWeight: "800",
  rotation: 3,
};

const VIBES_STYLE: Omit<MomentStickerBadgeStyle, "text"> = {
  backgroundColor: "#0b1628",
  color: "#7dd3fc",
  borderColor: "#38bdf8",
  fontWeight: "800",
  rotation: -2,
};

/** Built-in packs — always available, no device library required. */
export const MOMENT_BUILTIN_STICKERS: MomentStickerItem[] = [
  badge("ah-01", "after-hours", "After Hours", stickerLines("CHAOS", "COUPON"), AFTER_HOURS_STYLE, [
    "chaos",
    "coupon",
  ]),
  badge(
    "ah-02",
    "after-hours",
    "After Hours",
    stickerLines("BAD", "DECISION", "IN", "PROGRESS"),
    AFTER_HOURS_ALT,
    ["bad", "decision"]
  ),
  badge(
    "ah-03",
    "after-hours",
    "After Hours",
    stickerLines("SPONSORED", "BY", "POOR", "CHOICES"),
    AFTER_HOURS_STYLE,
    ["sponsored", "poor", "choices"]
  ),
  badge("ah-05", "after-hours", "After Hours", stickerLines("CERTIFIED", "MESS"), AFTER_HOURS_STYLE, [
    "certified",
    "mess",
  ]),
  badge("ah-06", "after-hours", "After Hours", stickerLines("RUNNING", "ON", "SPITE"), AFTER_HOURS_ALT, [
    "spite",
  ]),
  badge(
    "ah-07",
    "after-hours",
    "After Hours",
    stickerLines("VILLAIN", "ARC", "LOADING…"),
    AFTER_HOURS_STYLE,
    ["villain", "arc"]
  ),
  badge("ah-08", "after-hours", "After Hours", stickerLines("TOUCH", "GRASS?", "NO."), AFTER_HOURS_ALT, [
    "touch grass",
  ]),
  badge("ah-09", "after-hours", "After Hours", stickerLines("SEND", "HELP", "(don't)"), AFTER_HOURS_STYLE, [
    "send help",
  ]),
  badge(
    "ah-10",
    "after-hours",
    "After Hours",
    stickerLines("FLIRTING", "WITH", "DISASTER"),
    AFTER_HOURS_ALT,
    ["flirting", "disaster"]
  ),
  badge("ah-11", "after-hours", "After Hours", stickerLines("HORNY", "FOR", "CHAOS"), AFTER_HOURS_STYLE, [
    "horny",
    "chaos",
  ]),
  badge("ah-12", "after-hours", "After Hours", stickerLines("SIN", "BIN", "APPROVED"), AFTER_HOURS_ALT, [
    "sin",
  ]),
  badge(
    "ah-13",
    "after-hours",
    "After Hours",
    stickerLines("NOT", "SAFE", "FOR", "FEELINGS"),
    AFTER_HOURS_STYLE,
    ["feelings"]
  ),
  badge(
    "ah-14",
    "after-hours",
    "After Hours",
    stickerLines("DOWN", "BAD", "CONFIDENTIAL"),
    AFTER_HOURS_ALT,
    ["down bad"]
  ),
  badge(
    "ah-15",
    "after-hours",
    "After Hours",
    stickerLines("EMOTIONALLY", "UNAVAILABLE"),
    AFTER_HOURS_STYLE,
    ["emotionally unavailable"]
  ),
  badge("ah-16", "after-hours", "After Hours", stickerLines("GHOST", "ME", "HARDER"), AFTER_HOURS_ALT, [
    "ghost",
  ]),
  badge(
    "ah-17",
    "after-hours",
    "After Hours",
    stickerLines("GUILTY", "PLEASURE", "ERA"),
    AFTER_HOURS_STYLE,
    ["guilty pleasure"]
  ),
  badge(
    "ah-18",
    "after-hours",
    "After Hours",
    stickerLines("RUINED", "MY", "NIGHT", "(good)"),
    AFTER_HOURS_ALT,
    ["ruined", "night"]
  ),

  badge("vb-01", "vibes", "Vibes", stickerLines("IT'S", "GIVING", "UNHINGED"), VIBES_STYLE, ["unhinged"]),
  badge("vb-02", "vibes", "Vibes", stickerLines("NO", "THOUGHTS", "JUST", "VIBES"), VIBES_STYLE, ["vibes"]),
  badge("vb-03", "vibes", "Vibes", stickerLines("DELULU", "IS", "THE", "SOLULU"), VIBES_STYLE, ["delulu"]),
  badge(
    "vb-05",
    "vibes",
    "Vibes",
    stickerLines("MENTALLY", "AT", "THE", "FUNCTION"),
    VIBES_STYLE,
    ["function"]
  ),
  badge("vb-06", "vibes", "Vibes", stickerLines("LOWKEY", "FERAL"), VIBES_STYLE, ["feral"]),
];

export type MomentStickerSourceFilter = "builtin" | "yours";

export function filterMomentStickers(
  stickers: MomentStickerItem[],
  query: string,
  source: MomentStickerSourceFilter,
  packId: string | "all"
): MomentStickerItem[] {
  const q = query.trim().toLowerCase();
  return stickers.filter((sticker) => {
    if (source === "yours") {
      if (sticker.source !== "device") return false;
    } else if (sticker.source !== "builtin") {
      return false;
    } else if (packId !== "all" && sticker.packId !== packId) {
      return false;
    }

    if (!q) return true;
    const haystack = [
      sticker.badge?.text ?? "",
      sticker.emojiGlyph ?? "",
      sticker.packName,
      ...(sticker.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
