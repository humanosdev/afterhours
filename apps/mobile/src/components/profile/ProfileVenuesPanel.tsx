import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ShellListRow } from "../ShellListRow";
import { StableSlot } from "../ui/StableSlot";
import { ListRowSkeleton } from "../skeletons/ListRowSkeleton";
import { fetchProfileVenues, type ProfileVenueRow } from "../../lib/fetchProfileVenues";
import { formatVenueCategoryLabel } from "../../lib/venueDisplay";
import { colors } from "../../theme/colors";
import { profileLayout } from "../../theme/profileLayout";

type ProfileVenuesPanelProps = {
  userId: string | null | undefined;
  onCount?: (count: number) => void;
  suppressShellSkeleton?: boolean;
};

export function ProfileVenuesPanel({
  userId,
  onCount,
  suppressShellSkeleton = false,
}: ProfileVenuesPanelProps) {
  const router = useRouter();
  const [venues, setVenues] = useState<ProfileVenueRow[]>([]);
  const [loading, setLoading] = useState(() => Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setVenues([]);
      setLoading(false);
      setError(null);
      onCount?.(0);
      return;
    }
    setLoading(true);
    setError(null);
    const { venues: rows, error: nextError } = await fetchProfileVenues(userId);
    setVenues(rows);
    setError(nextError);
    setLoading(false);
    onCount?.(rows.length);
  }, [userId, onCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const slotLoading = loading && venues.length === 0 && !suppressShellSkeleton;

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>Venues</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StableSlot
        loading={slotLoading}
        skeleton={<ListRowSkeleton rows={4} />}
        style={{ minHeight: profileLayout.venuesListMinHeight }}
        variant="section"
      >
        {venues.length > 0 ? (
          <View>
            {venues.map((venue, index) => (
              <ShellListRow
                key={venue.id}
                title={venue.name}
                subtitle={formatVenueCategoryLabel(venue.category)}
                meta="Map"
                isLast={index === venues.length - 1}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(tabs)/map",
                    params: { venueId: venue.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <ProfileVenuesEmpty />
        )}
      </StableSlot>
    </View>
  );
}

function ProfileVenuesEmpty() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No venues yet</Text>
      <Text style={styles.emptyBody}>
        Stay at a venue for 15+ minutes and it&apos;ll show up here permanently.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingTop: profileLayout.tabContentTop,
  },
  head: {
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  error: {
    marginBottom: 8,
    fontSize: 13,
    color: colors.error,
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textWhite45,
    textAlign: "center",
    maxWidth: 300,
  },
});
