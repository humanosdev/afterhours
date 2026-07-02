import { StyleSheet, Text, View } from "react-native";
import type { MomentStickerBadgeStyle } from "../../lib/momentEditor";

type MomentStickerBadgeViewProps = {
  badge: MomentStickerBadgeStyle;
  compact?: boolean;
  lineCount?: number;
};

export function MomentStickerBadgeView({
  badge,
  compact = false,
  lineCount: lineCountProp,
}: MomentStickerBadgeViewProps) {
  const lines = badge.text.split("\n").filter(Boolean);
  const lineCount = lineCountProp ?? lines.length;
  const compactFontSize =
    lineCount <= 2 ? 6.5 : lineCount === 3 ? 5.5 : lineCount === 4 ? 4.8 : 4.2;
  const compactLineHeight = compactFontSize + 1;

  return (
    <View
      style={[
        styles.wrap,
        compact ? styles.wrapCompact : styles.wrapFull,
        {
          backgroundColor: badge.backgroundColor,
          borderColor: badge.borderColor ?? badge.color,
          transform: [{ rotate: `${badge.rotation ?? 0}deg` }],
        },
      ]}
    >
      {lines.map((line, index) => (
        <Text
          key={`${line}-${index}`}
          style={[
            compact ? styles.lineCompact : styles.lineFull,
            compact
              ? { fontSize: compactFontSize, lineHeight: compactLineHeight }
              : null,
            {
              color: badge.color,
              fontFamily: badge.fontFamily,
              fontWeight: badge.fontWeight ?? "800",
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={compact}
          minimumFontScale={0.65}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    gap: 1,
  },
  wrapCompact: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  wrapFull: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  lineCompact: {
    width: "100%",
    textAlign: "center",
    letterSpacing: 0.1,
  },
  lineFull: {
    width: "100%",
    textAlign: "center",
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
});
