import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ListRowSkeleton } from "../components/skeletons/ListRowSkeleton";
import { AsyncSection } from "../components/ui/AsyncSection";
import { LivePlacesVenueCard } from "../components/liveplaces/LivePlacesVenueCard";
import { AppSubpageScreen } from "../components/AppSubpageScreen";
import { useAcceptedFriends } from "../hooks/useAcceptedFriends";
import { useForegroundLocation } from "../hooks/useForegroundLocation";
import { fetchVenuesCatalog } from "../lib/fetchVenuesPreview";
import {
  buildLivePlacesVenueRows,
  distanceMilesToVenue,
  fetchVenueIdsWithStories,
  findMyLivePresence,
  livePlacesFriendPreviewIds,
} from "../lib/livePlaces";
import { profileUsernameLabel } from "../lib/profileDisplay";
import { useAuth } from "../providers/AuthProvider";
import { usePresence } from "../providers/PresenceProvider";
import { colors } from "../theme/colors";

import { LIVE_PLACES_PRESENCE_POLL_MS } from "../lib/backgroundReadPolicy";
import { presenceNowMs } from "../lib/presenceNowMs";

/** Live places — heat-ranked venue leaderboard with live presence. */
export function LivePlacesScreen() {
  const { user } = useAuth();
  const { presence, ghostByUserId, friendIdSet, presenceClock, reloadPresence } = usePresence();
  const { friends } = useAcceptedFriends(user?.id);
  const { coords: youCoords, permission: locationPermission } = useForegroundLocation(Boolean(user?.id));

  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venues, setVenues] = useState<Awaited<ReturnType<typeof fetchVenuesCatalog>>["venues"]>([]);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [storyVenueIds, setStoryVenueIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void fetchVenuesCatalog().then(({ venues: rows, error }) => {
      if (cancelled) return;
      setVenues(rows);
      setVenuesError(error);
      setVenuesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void fetchVenueIdsWithStories().then(setStoryVenueIds);
  }, []);

  /** Phase 3 — dedicated poll while on this screen (global hub poll also runs). */
  useEffect(() => {
    if (!user?.id) return;
    const id = setInterval(() => {
      void reloadPresence();
    }, LIVE_PLACES_PRESENCE_POLL_MS);
    return () => clearInterval(id);
  }, [reloadPresence, user?.id]);

  const myPresence = useMemo(
    () => findMyLivePresence(presence, user?.id ?? null),
    [presence, user?.id, presenceClock]
  );

  const youForDistance = useMemo(() => {
    if (youCoords && locationPermission === "granted") {
      return { lat: youCoords.lat, lng: youCoords.lng };
    }
    if (myPresence) return { lat: myPresence.lat, lng: myPresence.lng };
    return null;
  }, [youCoords, locationPermission, myPresence]);

  const venueRows = useMemo(
    () =>
      buildLivePlacesVenueRows(
        venues,
        presence,
        friendIdSet,
        user?.id ?? null,
        ghostByUserId
      ),
    [venues, presence, friendIdSet, user?.id, ghostByUserId, presenceClock]
  );

  const friendById = useMemo(
    () =>
      new Map(
        friends.map((f) => [
          f.id,
          { label: profileUsernameLabel(f, "Friend"), avatarUrl: f.avatar_url },
        ])
      ),
    [friends]
  );

  return (
    <AppSubpageScreen
      title="Live Venues"
      subtitle="Pins ranked by heat — your crew lifts a venue in the stack."
      tabBarInset
    >
      <AsyncSection
        loading={venuesLoading}
        skeleton={<ListRowSkeleton rows={7} />}
        style={styles.listSlot}
        contentKey={`${venueRows.length}.${presenceClock}`}
      >
        {venuesError ? (
          <Text style={styles.err}>{venuesError}</Text>
        ) : venueRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyZzz} aria-hidden>
              ZZZ
            </Text>
            <Text style={styles.emptyTitle}>City&apos;s taking a breath</Text>
            <Text style={styles.emptyBody}>
              No venue rows yet. When presence lights up, this list becomes a live leaderboard — check the
              map in the meantime.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {venueRows.map((v) => {
              const previewIds = livePlacesFriendPreviewIds(
                v.id,
                presence,
                friendIdSet,
                ghostByUserId,
                venues,
                presenceNowMs()
              );
              const friendPreviews = previewIds
                .map((id) => {
                  const p = friendById.get(id);
                  if (!p) return null;
                  return { userId: id, label: p.label, avatarUrl: p.avatarUrl };
                })
                .filter((x): x is NonNullable<typeof x> => x != null);

              return (
                <LivePlacesVenueCard
                  key={v.id}
                  venue={v}
                  distanceMi={distanceMilesToVenue(youForDistance, v)}
                  hasStoryActivity={storyVenueIds.has(v.id)}
                  friendPreviews={friendPreviews}
                />
              );
            })}
          </View>
        )}
      </AsyncSection>
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  listSlot: {
    minHeight: 390,
  },
  list: {
    paddingBottom: 8,
  },
  err: {
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
    marginTop: 16,
  },
  emptyCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 102, 255, 0.22)",
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  emptyZzz: {
    fontSize: 48,
    fontWeight: "900",
    color: "rgba(255, 255, 255, 0.07)",
    letterSpacing: -2,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite85,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: colors.textWhite45,
    maxWidth: 280,
  },
});
