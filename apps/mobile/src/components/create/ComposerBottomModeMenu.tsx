import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ComposerMode } from "../../lib/uploadStoryMediaTypes";
import { mediaLexicon } from "../../content/mediaLexicon";
import { colors } from "../../theme/colors";

type ComposerBottomModeMenuProps = {
  mode: ComposerMode;
  switchEnabled: boolean;
  onModeChange: (mode: ComposerMode) => void;
  disabled?: boolean;
};

/** Bottom mode strip — Moments · Shares. */
export function ComposerBottomModeMenu({
  mode,
  switchEnabled,
  onModeChange,
  disabled,
}: ComposerBottomModeMenuProps) {
  const items: Array<{ key: string; label: string; composerMode: ComposerMode }> = [
    { key: "moments", label: mediaLexicon.moment.labelPlural, composerMode: "moments" },
    { key: "shares", label: mediaLexicon.share.labelPlural, composerMode: "shares" },
  ];

  const visibleItems = switchEnabled ? items : items.filter((i) => i.composerMode === mode);

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {visibleItems.map((item) => {
        const selected = item.composerMode === mode;
        const canPress = switchEnabled && !disabled;

        return (
          <Pressable
            key={item.key}
            disabled={!canPress}
            onPress={() => onModeChange(item.composerMode)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !canPress }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  item: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: colors.textWhite42,
  },
  labelSelected: {
    color: "#fff",
    fontWeight: "700",
  },
});
