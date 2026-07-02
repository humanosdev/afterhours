import { Image } from "expo-image";
import { Dimensions, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const HUB_LOGO = require("../../assets/hub-logo.png");

/** IG-style boot mark — ~46% of screen width. */
export const HUB_BOOT_LOGO_SCALE = 0.46;

const LOGO_SIZE = Math.round(Dimensions.get("window").width * HUB_BOOT_LOGO_SCALE);

type HubBootLogoProps = {
  style?: StyleProp<ViewStyle>;
};

export function HubBootLogo({ style }: HubBootLogoProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={HUB_LOGO}
        style={styles.logo}
        contentFit="contain"
        contentPosition="center"
        cachePolicy="memory-disk"
        accessibilityLabel="Intencity"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
