import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

/**
 * Matches web `/hub` top chrome: logo strip + slogan (decorative ♡ — no navigation; UI parity only).
 */
export function HubTopChrome() {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.logoWell}>
          <Image
            accessibilityIgnoresInvertColors
            source={require("../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.sloganBlock}>
          <Text style={styles.slogan}>
            Live the city, feel the <Text style={styles.intencityWord}>intencity</Text>.
          </Text>
        </View>
      </View>
      <View style={styles.decorHeart} accessibilityElementsHidden>
        <Text style={styles.heart}>♡</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  logoWell: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 38,
    height: 38,
  },
  sloganBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  slogan: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textWhite55,
    lineHeight: 17,
  },
  intencityWord: {
    fontWeight: "600",
    color: colors.accentActive,
  },
  decorHeart: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(10, 12, 24, 0.72)",
    opacity: 0.92,
  },
  heart: {
    fontSize: 15,
    color: colors.textWhite78,
    marginTop: 1,
  },
});
