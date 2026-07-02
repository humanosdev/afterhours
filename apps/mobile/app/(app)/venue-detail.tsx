import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

/** Venue detail / scene room removed — open map sheet instead. */
export default function VenueDetailRoute() {
  const router = useRouter();
  const { venueId } = useLocalSearchParams<{ venueId?: string }>();

  useEffect(() => {
    const id = typeof venueId === "string" && venueId.trim() ? venueId.trim() : undefined;
    if (id) {
      router.replace({ pathname: "/(app)/(tabs)/map", params: { venueId: id } });
      return;
    }
    router.replace("/(app)/(tabs)/map");
  }, [router, venueId]);

  return null;
}
