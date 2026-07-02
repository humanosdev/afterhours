import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type AvatarOnlineBadgeProps = {
  /** Dot diameter — scales border with size. */
  size?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** Small green online dot — bottom-right of avatars (hub rail, map friends, etc.). */
export function AvatarOnlineBadge({
  size = 12,
  borderColor = colors.bgPrimary,
  style,
}: AvatarOnlineBadgeProps) {
  const borderWidth = size >= 14 ? 2 : 1.5;

  return (
    <View
      accessibilityElementsHidden
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: colors.success,
    zIndex: 2,
  },
});
