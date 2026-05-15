import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type IntencityWordmarkProps = {
  size?: "default" | "large";
  subtitle?: string;
};

export function IntencityWordmark({ size = "default", subtitle }: IntencityWordmarkProps) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, size === "large" && styles.titleLarge]}>Intencity</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  titleLarge: {
    fontSize: 34,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
