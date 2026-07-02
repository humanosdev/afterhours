import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

type AuthTextLinkProps = {
  label: string;
  onPress: () => void;
};

/** PWA accent link (`text-accent-violet`). */
export function AuthTextLink({ label, onPress }: AuthTextLinkProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.accent,
  },
});
