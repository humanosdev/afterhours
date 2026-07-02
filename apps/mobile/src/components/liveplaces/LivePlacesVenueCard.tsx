import { memo } from "react";
import { useRouter } from "expo-router";
import { Navigation } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "../ProfileAvatar";
import { VenueDiscoveryThumb } from "../discovery/VenueDiscoveryThumb";
import { formatMilesFromMeters } from "../../lib/formatMilesFromMeters";
import type { LivePlacesVenueRow } from "../../lib/livePlaces";
import { resolveVenueContextLine } from "../../lib/venueContextCopy";
import { formatVenueCategoryLabel } from "../../lib/venueDisplay";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";

type FriendPreview = { userId: string; label: string; avatarUrl: string | null };

type LivePlacesVenueCardProps = {
  venue: LivePlacesVenueRow;
  distanceMi: number | null;
  hasStoryActivity: boolean;
  friendPreviews: FriendPreview[];
};

export const LivePlacesVenueCard = memo(function LivePlacesVenueCard({
  venue,
  distanceMi,
  hasStoryActivity,
  friendPreviews,
}: LivePlacesVenueCardProps) {
  const router = useRouter();
  const contextLine = resolveVenueContextLine(new Date(), venue.context_copy);
  const distanceLabel =
    distanceMi != null ? formatMilesFromMeters(distanceMi * 1609.344) : null;

  const friendFootnote =
    friendPreviews.length > 0
      ? null
      : venue.friendsTotal > 0
        ? "Friends in range — not checked in here."
        : venue.total > 0
          ? "Crowd building — no friends on this pin yet."
          : "Dead air at this address for now.";

  return (
    <View style={[styles.card, hasStoryActivity && styles.cardStory]}>
      <View style={styles.cardBody}>
        <VenueDiscoveryThumb venue={venue} size={56} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {venue.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatVenueCategoryLabel(venue.category)}
            {distanceLabel ? ` · ${distanceLabel}` : ""}
            {` · ${venue.vibe}`}
          </Text>
          {contextLine ? (
            <Text style={styles.context} numberOfLines={2}>
              {contextLine}
            </Text>
          ) : null}

          <View style={styles.densityStrip}>
            <View style={styles.densityHalf}>
              <Text style={styles.densityLabel}>INSIDE</Text>
              <Text style={styles.densityValue}>{venue.inside}</Text>
              <Text style={styles.densitySub}>
                {venue.friendsInside ? `${venue.friendsInside} from your list` : "None listed"}
              </Text>
            </View>
            <View style={styles.densityDivider} />
            <View style={styles.densityHalf}>
              <Text style={styles.densityLabel}>NEARBY</Text>
              <Text style={styles.densityValue}>{venue.nearby}</Text>
              <Text style={styles.densitySub}>
                {venue.friendsNearby ? `${venue.friendsNearby} from your list` : "None listed"}
              </Text>
            </View>
          </View>

          {friendPreviews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendScroll}>
              {friendPreviews.map((f) => (
                <View key={f.userId} style={styles.friendChip}>
                  <ProfileAvatar avatarUrl={f.avatarUrl} label={f.label} size={28} bordered={false} />
                  <Text style={styles.friendChipLabel} numberOfLines={1}>
                    {f.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : friendFootnote ? (
            <Text style={styles.footnote}>{friendFootnote}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionSecondary, styles.actionSecondaryFull]}
          onPress={() => router.push({ pathname: "/(app)/(tabs)/map", params: { venueId: venue.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open ${venue.name} on map`}
        >
          <Navigation size={15} color={colors.accentActive} strokeWidth={2.1} />
          <Text style={styles.actionSecondaryLabel}>Open on map</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.cardRadius + 4,
    borderWidth: 1,
    borderColor: "rgba(59, 102, 255, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
    marginBottom: 12,
  },
  cardStory: {
    shadowColor: "#3B66FF",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardBody: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textWhite45,
  },
  context: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textWhite42,
  },
  densityStrip: {
    flexDirection: "row",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.22)",
    paddingVertical: 8,
    marginTop: 4,
  },
  densityHalf: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  densityDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 2,
  },
  densityLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: colors.textWhite42,
  },
  densityValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 2,
  },
  densitySub: {
    fontSize: 10,
    color: colors.textWhite42,
    marginTop: 2,
    textAlign: "center",
  },
  friendScroll: {
    marginTop: 6,
  },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 8,
    maxWidth: 140,
  },
  friendChipLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite75,
    flexShrink: 1,
  },
  footnote: {
    fontSize: 10,
    color: colors.textWhite42,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingVertical: 10,
  },
  actionSecondaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textWhite85,
  },
  actionSecondaryFull: {
    flex: 1,
  },
});
