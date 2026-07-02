import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Surface } from "../Surface";
import { colors } from "../../theme/colors";

type DiscoverySearchRowProps = {
  onPress: () => void;
  leading: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DiscoverySearchRow({
  onPress,
  leading,
  title,
  subtitle,
  trailing,
  style,
}: DiscoverySearchRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      <Surface variant="card" style={styles.surface}>
        <View style={styles.inner}>
          {leading}
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {trailing}
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 16,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.92,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textWhite45,
  },
});
