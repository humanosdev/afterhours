import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import { MapVenueSheet } from "../components/map/MapVenueSheet";
import { tabBarMetrics } from "../shell/tabBarMetrics";
import type { VenuePresenceSheetStats, VenueSheetPeople } from "../lib/venuePresenceStats";
import type { VenuePublic } from "../types/venue";

export type MapVenueSheetPayload = {
  venue: VenuePublic;
  presenceStats?: VenuePresenceSheetStats;
  venuePeople?: VenueSheetPeople;
  youAreHere?: boolean;
  youAreHereLive?: boolean;
  youAreHereSettling?: boolean;
  onFocusFriend?: (friendId: string) => void;
  onInteraction?: () => void;
};

type MapVenueSheetContextValue = {
  sheetVenueId: string | null;
  sheetOpen: boolean;
  openMapVenueSheet: (payload: MapVenueSheetPayload) => void;
  closeMapVenueSheet: () => void;
};

const MapVenueSheetContext = createContext<MapVenueSheetContextValue | null>(null);

export function MapVenueSheetProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<MapVenueSheetPayload | null>(null);
  const [visible, setVisible] = useState(false);

  const openMapVenueSheet = useCallback((next: MapVenueSheetPayload) => {
    setPayload(next);
    setVisible(true);
  }, []);

  const closeMapVenueSheet = useCallback(() => {
    setVisible(false);
  }, []);

  const handleClosed = useCallback(() => {
    setVisible(false);
    setPayload(null);
  }, []);

  const value = useMemo(
    () => ({
      sheetVenueId: payload?.venue.id ?? null,
      sheetOpen: visible,
      openMapVenueSheet,
      closeMapVenueSheet,
    }),
    [closeMapVenueSheet, openMapVenueSheet, payload?.venue.id, visible]
  );

  return (
    <MapVenueSheetContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {payload ? (
          <View style={styles.host} pointerEvents="box-none">
            <MapVenueSheet
              visible={visible}
              venue={payload.venue}
              presenceStats={payload.presenceStats}
              venuePeople={payload.venuePeople}
              youAreHere={payload.youAreHere}
              youAreHereLive={payload.youAreHereLive}
              youAreHereSettling={payload.youAreHereSettling}
              onFocusFriend={payload.onFocusFriend}
              onInteraction={payload.onInteraction}
              onClosed={handleClosed}
            />
          </View>
        ) : null}
      </View>
    </MapVenueSheetContext.Provider>
  );
}

export function useMapVenueSheet() {
  const ctx = useContext(MapVenueSheetContext);
  if (!ctx) {
    throw new Error("useMapVenueSheet must be used within MapVenueSheetProvider");
  }
  return ctx;
}

export function useMapVenueSheetOptional() {
  return useContext(MapVenueSheetContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: tabBarMetrics.zIndex + 40,
    justifyContent: "flex-end",
  },
});
