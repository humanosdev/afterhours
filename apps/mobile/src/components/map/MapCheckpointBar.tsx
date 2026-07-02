import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  checkpointBarHeatBorderColor,
  checkpointBarHeatPulseTier,
  checkpointBarHeatShadowColor,
} from "../../lib/mapCheckpointHeat";
import { formatMilesFromMeters } from "../../lib/formatMilesFromMeters";
import { localHourIsMapDaytime, mapChromeForMode } from "../../theme/mapDayChrome";
import { layout } from "../../theme/layout";
import type { VenuePublic } from "../../types/venue";

type MapCheckpointBarProps = {
  venue: VenuePublic | null;
  width: number;
  activity?: number;
  distanceFromYouM?: number;
  hasYouCoords?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenVenue: () => void;
};

/** PWA checkpoint bar — heat-tinted border when venue has live crowd. */
export function MapCheckpointBar({
  venue,
  width,
  activity = 0,
  distanceFromYouM,
  hasYouCoords = false,
  onPrev,
  onNext,
  onOpenVenue,
}: MapCheckpointBarProps) {
  const dayMode = localHourIsMapDaytime();
  const chrome = mapChromeForMode(dayMode);
  const heatBorder = checkpointBarHeatBorderColor(activity, dayMode);
  const heatShadow = checkpointBarHeatShadowColor(activity, dayMode);
  const pulseTier = checkpointBarHeatPulseTier(activity);

  const checkpointLabel = venue
    ? hasYouCoords && distanceFromYouM != null && Number.isFinite(distanceFromYouM)
      ? `${venue.name} • ${formatMilesFromMeters(distanceFromYouM)}`
      : hasYouCoords
        ? venue.name
        : `${venue.name} • locating...`
    : "No crowd yet";

  return (
    <View style={[styles.barOuter, { width }]}>
      {pulseTier !== "off" ? (
        <View
          pointerEvents="none"
          style={[
            styles.pulseOverlay,
            {
              shadowColor: heatShadow,
              shadowOpacity: pulseTier === "strong" ? 0.9 : 0.65,
              shadowRadius: pulseTier === "strong" ? 26 : 18,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.bar,
          {
            borderColor: activity > 0 ? heatBorder : chrome.checkpointBarBorder,
            backgroundColor: chrome.checkpointBarBg,
            shadowColor: activity > 0 ? heatShadow : chrome.checkpointBarShadow,
          },
        ]}
      >
      <Pressable
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous checkpoint"
        style={[
          styles.nav,
          { borderColor: chrome.checkpointNavBorder, backgroundColor: chrome.checkpointNavBg },
        ]}
      >
        <ChevronLeft size={26} color={chrome.ink90} strokeWidth={2.5} />
      </Pressable>
      <Pressable
        onPress={onOpenVenue}
        disabled={!venue}
        accessibilityRole="button"
        accessibilityLabel={venue ? `Open ${venue.name}` : "No checkpoint"}
        style={styles.center}
      >
        <Text style={[styles.title, { color: chrome.ink92 }]} numberOfLines={1}>
          {checkpointLabel}
        </Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel="Next checkpoint"
        style={[
          styles.nav,
          { borderColor: chrome.checkpointNavBorder, backgroundColor: chrome.checkpointNavBg },
        ]}
      >
        <ChevronRight size={26} color={chrome.ink90} strokeWidth={2.5} />
      </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barOuter: {
    overflow: "visible",
    borderRadius: layout.cardRadius,
  },
  pulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: layout.cardRadius,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  nav: {
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
