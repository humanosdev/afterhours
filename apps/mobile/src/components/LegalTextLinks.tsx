import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type LegalTextLinksProps = {
  /** e.g. "By continuing, you agree to our " */
  prefix: string;
};

/** Tappable Terms + Privacy links — mirrors web auth footer. */
export function LegalTextLinks({ prefix }: LegalTextLinksProps) {
  const router = useRouter();

  return (
    <Text style={[typography.legal, styles.wrap]}>
      {prefix}
      <Text style={styles.link} onPress={() => router.push("/terms")}>
        Terms of Service
      </Text>
      {" and "}
      <Text style={styles.link} onPress={() => router.push("/privacy")}>
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    textAlign: "center",
  },
  link: {
    color: colors.accent,
    fontWeight: "500",
  },
});
