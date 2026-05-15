import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type StoryRingPlaceholderProps = {
  label: string;
  accent?: boolean;
};

export function StoryRingPlaceholder({ label, accent = false }: StoryRingPlaceholderProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, accent && styles.ringAccent]}>
        <View style={styles.inner} />
        {accent ? (
          <View style={styles.plusBadge}>
            <Text style={styles.plus}>+</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  ringAccent: {
    borderColor: colors.accent,
  },
  inner: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: colors.surfaceHover,
  },
  plusBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: -1,
  },
  label: {
    width: "100%",
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
});
