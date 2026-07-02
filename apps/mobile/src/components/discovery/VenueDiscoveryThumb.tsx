import { StyleSheet, Text, View } from "react-native";
import { RemoteImage } from "../media/RemoteImage";
import { resolveVenueCategoryAccentKey, venueAccentRgba, venueCategoryAccentHex } from "../../lib/venueCategoryAccent";
import type { VenuePublic } from "../../types/venue";
import { venueDisplayImageUrl } from "../../types/venue";

type VenueDiscoveryThumbProps = {
  venue: VenuePublic;
  size?: number;
};

export function VenueDiscoveryThumb({ venue, size = 48 }: VenueDiscoveryThumbProps) {
  const accent = venueCategoryAccentHex(resolveVenueCategoryAccentKey(venue));
  const img = venueDisplayImageUrl(venue);
  const radius = size >= 44 ? 12 : 10;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          shadowColor: venueAccentRgba(accent, 1),
        },
      ]}
    >
      {img ? (
        <RemoteImage uri={img} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
          <Text style={styles.initials}>{venue.name.slice(0, 2).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  initials: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.28)",
  },
});
