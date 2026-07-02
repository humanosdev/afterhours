import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { RemoteImage } from "../components/media/RemoteImage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Navigation, Sparkles } from "lucide-react-native";
import { AppSubpageScreen } from "../components/AppSubpageScreen";
import { PrimaryButton } from "../components/PrimaryButton";
import { IntencityPanel } from "../components/ui/IntencityPanel";
import { Skeleton, SkeletonLine } from "../components/ui/Skeleton";
import { useAcceptedFriends } from "../hooks/useAcceptedFriends";
import { useAuth } from "../providers/AuthProvider";
import { usePresence } from "../providers/PresenceProvider";
import { fetchVenueById } from "../lib/fetchVenueById";
import { profileUsernameLabel } from "../lib/profileDisplay";
import { presenceNowMs } from "../lib/presenceNowMs";
import { getVenueSheetPeople, getVenueSheetPresenceStats } from "../lib/venuePresenceStats";
import { resolveVenueContextLine } from "../lib/venueContextCopy";
import { formatVenueCategoryLabel } from "../lib/venueDisplay";
import { colors } from "../theme/colors";
import { mapDayChrome } from "../theme/mapDayChrome";
import type { VenuePublic } from "../types/venue";
import { venueDisplayImageUrl } from "../types/venue";
import { layout } from "../theme/layout";

type VenueActivityScreenProps = {
  venueId?: string;
};

function openDirections(venue: VenuePublic) {
  if (venue.lat == null || venue.lng == null) return;
  const destination = `${venue.lat},${venue.lng}`;
  const href =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  void Linking.openURL(href);
}

/** PWA `/venue-activity` — venue shell; live counts deferred until presence. */
export function VenueActivityScreen({ venueId }: VenueActivityScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { presence, ghostByUserId, friendIdSet, presenceClock } = usePresence();
  const { friends } = useAcceptedFriends(user?.id);
  const [tab, setTab] = useState<"activity" | "info">("activity");
  const [loading, setLoading] = useState(Boolean(venueId));
  const [venue, setVenue] = useState<VenuePublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueId) {
      setLoading(false);
      setVenue(null);
      return;
    }
    setLoading(true);
    const result = await fetchVenueById(venueId);
    setVenue(result.venue);
    setError(result.error);
    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const contextLine = useMemo(
    () => (venue ? resolveVenueContextLine(new Date(), venue.context_copy) : null),
    [venue]
  );

  const presenceStats = useMemo(() => {
    if (!venue) return null;
    return getVenueSheetPresenceStats(
      venue,
      presence,
      friendIdSet,
      user?.id ?? null,
      ghostByUserId,
      presenceNowMs()
    );
  }, [venue, presence, friendIdSet, user?.id, ghostByUserId, presenceClock]);

  const venuePeople = useMemo(() => {
    if (!venue) return null;
    return getVenueSheetPeople(
      venue,
      presence,
      friends.map((f) => ({
        id: f.id,
        label: profileUsernameLabel(f, "Friend"),
        avatar_url: f.avatar_url,
      })),
      user?.id ?? null,
      ghostByUserId,
      presenceNowMs()
    );
  }, [venue, presence, friends, user?.id, ghostByUserId, presenceClock]);

  if (!venueId) {
    return (
      <AppSubpageScreen title="Venue activity" subtitle="Recent activity at this venue" tabBarInset>
        <IntencityPanel style={styles.emptyCard}>
          <MapPin size={28} color={colors.accentActive} strokeWidth={2} />
          <Text style={styles.emptyTitle}>No pin selected</Text>
          <Text style={styles.emptyBody}>
            Open this screen from Live Venues or the map so we know which room you&apos;re standing in.
          </Text>
          <PrimaryButton label="Browse Live Venues" variant="accent" onPress={() => router.push("/live-places")} />
        </IntencityPanel>
      </AppSubpageScreen>
    );
  }

  if (loading) {
    return (
      <AppSubpageScreen title="Venue activity" tabBarInset>
        <SkeletonLine width="60%" height={22} />
        <Skeleton style={styles.heroSkel} />
      </AppSubpageScreen>
    );
  }

  if (!venue) {
    return (
      <AppSubpageScreen title="Venue activity" tabBarInset>
        <Text style={styles.err}>{error ?? "Venue not found."}</Text>
        <PrimaryButton label="Back to map" variant="accent" onPress={() => router.push("/(app)/(tabs)/map")} />
      </AppSubpageScreen>
    );
  }

  const heroUrl = venueDisplayImageUrl(venue);

  return (
    <AppSubpageScreen
      title={venue.name}
      subtitle={formatVenueCategoryLabel(venue.category)}
      tabBarInset
    >
      {contextLine ? <Text style={styles.context}>{contextLine}</Text> : null}

      <View style={styles.tabs}>
        {(["activity", "info"] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === key }}
          >
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelOn]}>
              {key === "activity" ? "Activity" : "Info"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "activity" ? (
        <>
          <IntencityPanel style={styles.densityStrip}>
            <View style={styles.densityHalf}>
              <Text style={styles.densityLabel}>INSIDE</Text>
              <Text style={styles.densityValue}>
                {presenceStats ? String(presenceStats.insideTotal) : "—"}
              </Text>
              <Text style={styles.densitySub}>
                {presenceStats && presenceStats.insideFriends > 0
                  ? `${presenceStats.insideFriends} friend${presenceStats.insideFriends === 1 ? "" : "s"}`
                  : "Anyone live inside"}
              </Text>
            </View>
            <View style={styles.densityDivider} />
            <View style={styles.densityHalf}>
              <Text style={styles.densityLabel}>NEARBY</Text>
              <Text style={styles.densityValue}>
                {presenceStats ? String(presenceStats.nearbyTotal) : "—"}
              </Text>
              <Text style={styles.densitySub}>
                {presenceStats && presenceStats.nearbyFriends > 0
                  ? `${presenceStats.nearbyFriends} friend${presenceStats.nearbyFriends === 1 ? "" : "s"}`
                  : "Anyone live nearby"}
              </Text>
            </View>
          </IntencityPanel>
          <IntencityPanel style={styles.quietPanel}>
            <Text style={styles.quietCopy}>
              {venuePeople && venuePeople.insideFriends.length + venuePeople.nearbyFriends.length > 0
                ? `${venuePeople.insideFriends.length + venuePeople.nearbyFriends.length} friends live at this pin — open the map tab to focus them.`
                : venuePeople && venuePeople.insideAllCount + venuePeople.nearbyAllCount > 0
                  ? `${venuePeople.insideAllCount + venuePeople.nearbyAllCount} people in range—none on your friends list yet.`
                  : "Quiet pin for now. When the night spikes, faces stack here first."}
            </Text>
          </IntencityPanel>
          <Pressable
            onPress={() => router.push({ pathname: "/(app)/(tabs)/map", params: { venueId: venue.id } })}
            accessibilityRole="button"
          >
            <LinearGradient colors={["#3b66ff", "#3558d4"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cta}>
              <Sparkles size={18} color="#fff" strokeWidth={2.2} />
              <Text style={styles.ctaLabel}>Open on map</Text>
            </LinearGradient>
          </Pressable>
        </>
      ) : (
        <>
          {heroUrl ? (
            <RemoteImage uri={heroUrl} layoutClass="VENUE_HERO" contentFit="cover" accessibilityLabel={venue.name} />
          ) : null}
          <IntencityPanel style={styles.infoPanel}>
            <Text style={styles.infoRow}>{formatVenueCategoryLabel(venue.category)}</Text>
            {venue.lat != null && venue.lng != null ? (
              <Text style={styles.infoMuted}>
                {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
              </Text>
            ) : (
              <Text style={styles.infoMuted}>Coordinates not available</Text>
            )}
          </IntencityPanel>
          <Pressable
            onPress={() => openDirections(venue)}
            disabled={venue.lat == null}
            style={styles.dirBtn}
            accessibilityRole="button"
            accessibilityLabel="Open directions"
          >
            <Navigation size={18} color={mapDayChrome.ink90} strokeWidth={2.1} />
            <Text style={styles.dirLabel}>Directions</Text>
          </Pressable>
        </>
      )}
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  context: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite42,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    borderRadius: layout.chipRadius,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabOn: {
    borderColor: "rgba(59, 102, 255, 0.45)",
    backgroundColor: "rgba(59, 102, 255, 0.2)",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textWhite55,
  },
  tabLabelOn: {
    color: colors.textPrimary,
  },
  densityStrip: {
    flexDirection: "row",
    paddingVertical: 14,
    marginBottom: 12,
  },
  densityHalf: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  densityDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.09)",
  },
  densityLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.textWhite42,
  },
  densityValue: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  densitySub: {
    fontSize: 11,
    color: colors.textWhite45,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  quietPanel: {
    padding: 12,
    marginBottom: 14,
  },
  quietCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: layout.cardRadius,
    paddingVertical: 13,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  hero: {
    width: "100%",
    height: 160,
    borderRadius: layout.cardRadius,
    marginBottom: 12,
    backgroundColor: colors.bgSecondary,
  },
  infoPanel: {
    padding: 14,
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  infoMuted: {
    fontSize: 13,
    color: colors.textMuted,
  },
  dirBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: mapDayChrome.panelBorder,
    backgroundColor: mapDayChrome.panelBg,
    paddingVertical: 12,
  },
  dirLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: mapDayChrome.ink90,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite45,
    textAlign: "center",
    marginBottom: 8,
  },
  err: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: 12,
  },
  heroSkel: {
    height: 160,
    borderRadius: layout.cardRadius,
    marginTop: 12,
  },
});
