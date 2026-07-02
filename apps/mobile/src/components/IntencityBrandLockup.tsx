import { Image } from "expo-image";
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { brandLockupDimensions } from "../theme/brandLockup";

const LOCKUP_SOURCE = require("../../assets/splash-lockup.png");

type Variant = "splash" | "auth";

type IntencityBrandLockupProps = {
  variant?: Variant;
  /** Tighter max height on short phones (landing). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Mirrors web `IntencityBrandLockupImage` — viewport-scaled lockup, no fixed-height letterboxing. */
export function IntencityBrandLockup({ variant = "auth", compact, style }: IntencityBrandLockupProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { width, height } = brandLockupDimensions(variant, windowWidth, windowHeight, { compact });

  return (
    <View style={[styles.wrap, style]} accessibilityRole="image" accessibilityLabel="Intencity">
      <Image
        source={LOCKUP_SOURCE}
        style={{ width, height, minWidth: Math.min(width, 120), minHeight: Math.min(height, 48) }}
        contentFit="contain"
        contentPosition="center"
        cachePolicy="memory-disk"
        transition={0}
        priority="high"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
