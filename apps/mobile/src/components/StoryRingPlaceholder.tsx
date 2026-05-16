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
    width: 84,
    alignItems: "center",
    gap: 8,
  },
  ring: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 2,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "visible",
  },
  ringAccent: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  inner: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  plusBadge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: -1,
  },
  label: {
    width: "100%",
    fontSize: 12,
    lineHeight: 15,
    color: colors.textWhite55,
    textAlign: "center",
  },
});
