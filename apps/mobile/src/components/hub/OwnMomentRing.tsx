import { Pressable, StyleSheet, Text, View } from "react-native";
import { StoryRing } from "../StoryRing";
import type { StoryRingVisualState } from "../../theme/paritySemantics";
import { colors } from "../../theme/colors";
import { ringTokens } from "../../theme/ring";

const RING_OUTER = 78;
const BADGE_SIZE = 24;

type OwnMomentRingProps = {
  avatarUrl: string | null;
  label: string;
  loading?: boolean;
  ringState: StoryRingVisualState;
  /** When false, show + badge overlay (PWA no active story). */
  hasActiveStory?: boolean;
  onPress?: () => void;
  onPressIn?: () => void;
};

/**
 * Hub “Your moment” — badge anchors to ring only; caption sits below (PWA structure).
 */
export function OwnMomentRing({
  avatarUrl,
  label,
  loading = false,
  ringState,
  hasActiveStory = false,
  onPress,
  onPressIn,
}: OwnMomentRingProps) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Your moment"
    >
      <View style={[styles.ringAnchor, loading && styles.loading]}>
        <StoryRing
          label={label}
          avatarUrl={avatarUrl}
          ringState={ringState}
          size="storyLg"
          showCaption={false}
        />
        {!hasActiveStory ? (
          <View style={styles.plusBadge} pointerEvents="none">
            <Text style={styles.plus}>+</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.caption} numberOfLines={1}>
        Your moment
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: RING_OUTER,
    alignItems: "flex-start",
  },
  ringAnchor: {
    width: RING_OUTER,
    height: RING_OUTER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    zIndex: 2,
  },
  loading: {
    opacity: 0.65,
  },
  plusBadge: {
    position: "absolute",
    right: 1,
    bottom: -2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    ...ringTokens.activeGlow,
  },
  plus: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 14,
    marginTop: -1,
  },
  caption: {
    marginTop: 6,
    width: "100%",
    fontSize: 12,
    lineHeight: 15,
    color: colors.textWhite55,
    textAlign: "center",
  },
});
