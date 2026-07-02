import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { RemoteImage } from "./media/RemoteImage";
import { radiusScale } from "../theme/radiusScale";
import { hubVenueCardWidth } from "../theme/hubLayout";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { surfaces } from "../theme/surfaces";
import type { VenuePublic } from "../types/venue";
import { venueDisplayImageUrl } from "../types/venue";

type VenueChipPlaceholderProps = {
  venue: VenuePublic;
  name: string;
  meta: string;
};

/** Live Places card — PWA 5:6 aspect, compact footer (activity count static until P2O-C). */
export function VenueChipPlaceholder({ venue, name, meta }: VenueChipPlaceholderProps) {
  const imageUrl = venueDisplayImageUrl(venue);
  const cardW = hubVenueCardWidth(Dimensions.get("window").width);

  return (
    <View style={[styles.chip, { width: cardW }]}>
      <View style={styles.cover}>
        {imageUrl ? (
          <RemoteImage
            uri={imageUrl}
            layoutClass="VENUE_CARD"
            venueCardWidth={cardW}
            contentFit="cover"
            accessibilityLabel={name}
          />
        ) : (
          <View style={styles.coverFallback}>
            <Text style={styles.coverInitial} numberOfLines={1}>
              {name.trim().slice(0, 2).toUpperCase() || "·"}
            </Text>
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(10, 12, 24, 0.2)", "rgba(10, 12, 24, 0.88)"]}
          locations={[0.5, 0.72, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.footerRow}>
          <View style={styles.nameCol}>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          <View style={styles.activityPill} accessibilityLabel="Live activity count available after presence update">
            <Text style={styles.activityLbl}>LIVE</Text>
            <Text style={styles.activityCount}>—</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radiusScale.sheet,
    borderWidth: 1,
    borderColor: surfaces.border,
    backgroundColor: surfaces.surface,
    padding: 0,
    overflow: "hidden",
  },
  cover: {
    aspectRatio: 5 / 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 102, 255, 0.06)",
  },
  coverInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textMuted,
    opacity: 0.45,
    letterSpacing: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 24,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 17,
  },
  meta: {
    fontSize: 10,
    color: colors.textWhite42,
    lineHeight: 13,
    textTransform: "capitalize",
  },
  activityPill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.accentBrandMuted,
  },
  activityLbl: {
    fontSize: 8,
    fontWeight: "600",
    color: colors.textWhite85,
    letterSpacing: 0.8,
  },
  activityCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
});
