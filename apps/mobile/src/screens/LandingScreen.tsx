import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AuthViewportLayout } from "../components/AuthViewportLayout";
import { IntencityBrandLockup } from "../components/IntencityBrandLockup";
import { LandingFeatureRow } from "../components/LandingFeatureRow";
import { LegalTextLinks } from "../components/LegalTextLinks";
import { PrimaryButton } from "../components/PrimaryButton";
import { SecondaryButton } from "../components/SecondaryButton";
import { isCompactLandingViewport, landingSpacing } from "../theme/landingLayout";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

/** Mirrors web `/` → `HomeLanding` — viewport-fit; scroll only on tight devices / overflow. */
export function LandingScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const compact = isCompactLandingViewport(windowHeight);
  const space = useMemo(() => landingSpacing(windowHeight), [windowHeight]);
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [drift]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 + drift.value * 8 }],
    opacity: 0.75 + drift.value * 0.2,
  }));

  return (
    <AuthViewportLayout pinFooter>
      <View style={styles.upper}>
        <View style={[styles.hero, { marginBottom: space.heroMarginBottom }]}>
          <Animated.View style={[styles.glowWrap, glowStyle]} pointerEvents="none" accessibilityElementsHidden>
            <LinearGradient
              colors={["rgba(59, 102, 255, 0.2)", "rgba(59, 102, 255, 0.04)", "transparent"]}
              style={styles.glow}
            />
          </Animated.View>

          <IntencityBrandLockup
            variant="auth"
            compact
            style={[styles.lockup, { marginBottom: space.lockupMarginBottom }]}
          />
          <Text style={styles.tagline}>
            See where people are, what&apos;s active, and where your friends are moving — live.
          </Text>
        </View>

        <View style={[styles.features, { gap: space.featuresGap, marginBottom: space.featuresMarginBottom }]}>
          <LandingFeatureRow
            compact={compact}
            index={0}
            icon={<Ionicons name="sparkles" size={18} color={colors.accentActive} />}
            title="Know the vibe before you go"
            body="Scan energy, crowds, and motion before you step out."
          />
          <LandingFeatureRow
            compact={compact}
            index={1}
            icon={<Ionicons name="people" size={18} color={colors.accentActive} />}
            title="See where your friends are"
            body="Stay close to the crew when the night shifts."
          />
          <LandingFeatureRow
            compact={compact}
            index={2}
            icon={<Ionicons name="radio" size={18} color={colors.accentActive} />}
            title="Discover what's happening live"
            body="Moments, venues, and the map — one pulse."
          />
        </View>
      </View>

      <View style={styles.lower}>
        <View style={[styles.ctaBlock, { marginBottom: space.ctaMarginBottom }]}>
          <Ionicons name="location" size={20} color={colors.accent} style={styles.ctaIcon} />
          <Text style={styles.ctaTitle}>Your city is already moving.</Text>
          <Text style={styles.ctaSub}>Join Intencity.</Text>
        </View>

        <View style={[styles.buttons, { marginBottom: space.buttonsMarginBottom }]}>
          <PrimaryButton label="Create account" variant="auth" onPress={() => router.push("/signup")} />
          <SecondaryButton label="Log in" onPress={() => router.push("/login")} />
        </View>

        <View style={{ marginTop: space.legalMarginTop }}>
          <LegalTextLinks prefix="By joining, you agree to our " />
        </View>
      </View>
    </AuthViewportLayout>
  );
}

const styles = StyleSheet.create({
  upper: {
    width: "100%",
  },
  lower: {
    width: "100%",
  },
  hero: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  glowWrap: {
    position: "absolute",
    top: -16,
    alignSelf: "center",
    width: 280,
    height: 100,
    zIndex: 0,
  },
  glow: {
    flex: 1,
    borderRadius: 999,
  },
  lockup: {
    zIndex: 1,
  },
  tagline: {
    ...typography.body,
    textAlign: "center",
    maxWidth: 352,
    alignSelf: "center",
    lineHeight: 20,
    zIndex: 1,
  },
  features: {
    maxWidth: 448,
    width: "100%",
    alignSelf: "center",
  },
  ctaBlock: {
    alignItems: "center",
    gap: 3,
  },
  ctaIcon: {
    marginBottom: 1,
    opacity: 0.85,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.25,
    color: colors.textPrimary,
    textAlign: "center",
  },
  ctaSub: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textWhite55,
    textAlign: "center",
  },
  buttons: {
    gap: 10,
    maxWidth: 384,
    width: "100%",
    alignSelf: "center",
  },
});
