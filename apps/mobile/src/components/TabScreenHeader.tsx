import { StyleSheet, Text, View } from "react-native";
import { PhaseBadge } from "./PhaseBadge";
import { colors } from "../theme/colors";

type TabScreenHeaderProps = {
  title: string;
  subtitle: string;
  phaseLabel?: string;
};

export function TabScreenHeader({ title, subtitle, phaseLabel }: TabScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <PhaseBadge label={phaseLabel} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
