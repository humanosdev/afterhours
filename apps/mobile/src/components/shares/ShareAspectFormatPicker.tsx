import { Pressable, StyleSheet, Text, View } from "react-native";
import { SHARE_ASPECT_OPTIONS, type ShareAspectFormat } from "../../lib/shareAspect";
import { colors } from "../../theme/colors";

type ShareAspectFormatPickerProps = {
  value: ShareAspectFormat;
  onChange: (format: ShareAspectFormat) => void;
  /** When true, pills are visible but not tappable (preview-only). */
  readOnly?: boolean;
};

/** IG-style share frame — Portrait 4:5 and Square 1:1 (hub + viewer use the same tokens). */
export function ShareAspectFormatPicker({
  value,
  onChange,
  readOnly = false,
}: ShareAspectFormatPickerProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {SHARE_ASPECT_OPTIONS.map((opt) => {
        const selected = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              if (!readOnly && opt.id !== value) onChange(opt.id);
            }}
            disabled={readOnly}
            style={[styles.pill, selected && styles.pillOn, readOnly && !selected && styles.pillReadOnly]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${opt.label} ${opt.shortLabel}`}
          >
            <Text style={[styles.label, selected && styles.labelOn]}>{opt.label}</Text>
            <Text style={[styles.sub, selected && styles.subOn]}>{opt.shortLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pill: {
    minWidth: 108,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 2,
  },
  pillOn: {
    borderColor: colors.accentActive,
    backgroundColor: "rgba(0,149,246,0.12)",
  },
  pillReadOnly: {
    opacity: 0.45,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textWhite55,
  },
  labelOn: {
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textWhite42,
  },
  subOn: {
    color: colors.accentActive,
  },
});
