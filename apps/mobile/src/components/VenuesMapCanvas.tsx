import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState, NativeModules, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { MapCategoryPin } from "./map/MapCategoryPin";
import { resolveVenueCategoryAccentKey } from "../lib/venueCategoryAccent";
import {
  heatmapColorStyle,
  heatmapIntensityStyle,
  heatmapOpacityStyle,
  heatmapRadiusStyle,
  venueCoreCircleRadiusStyle,
  venueGlowCircleOpacityStyle,
  venueGlowCircleRadiusStyle,
  venueGlowColorStyle,
} from "../lib/mapVenueActivity";
import {
  categoryPinIconSizeForZoom,
  categoryPinOpacityForZoom,
  venuePresenceClusterOffsetForZoom,
  shouldShowPresenceMarkers,
  shouldShowVenueNameLabels,
  venuePinLabelOpacityStyle,
} from "../lib/mapMarkerZoom";
import {
  districtFlowCoreLineStyleAnimated,
  districtFlowGlowLineStyleAnimated,
  DISTRICT_FLOW_MAX_ZOOM,
} from "../lib/mapDistrictFlowLayers";
import {
  prunePresenceMarkerTargets,
  setPresenceMarkerTarget,
  tickPresenceMarkerMotion,
} from "../lib/presenceMarkerMotion";
import {
  applyPwaCameraMove,
  type PwaCameraMove,
} from "../lib/mapCameraMotion";
import { formatMapMarkerLastSeen } from "../lib/time";
import { mapAtmosphereStyleForDayMode } from "../theme/mapAtmosphere";
import {
  localHourIsMapDaytime,
  mapDayChrome,
  mapNightChrome,
  mapStyleUrlForDayMode,
  mapStyleUrlForLocalClock,
} from "../theme/mapDayChrome";
import { MapBrandedBasemapLayers } from "./map/MapBrandedBasemapLayers";
import { MAP_YOU_GPS_MARKER_ID } from "./map/MapSmoothYouDot";
import { MapSmoothPresenceMarker } from "./map/MapSmoothPresenceMarker";
import { MapVenuePresenceCluster } from "./map/MapVenuePresenceCluster";
import type {
  MapFriendPresenceMarker,
  MapLocalYouMarker,
  MapVenuePresenceCluster as MapVenuePresenceClusterModel,
} from "../lib/mapPresenceMarkers";
import type { VenuePublic } from "../types/venue";
import { MAP_FALLBACK_CENTER_LAT, MAP_FALLBACK_CENTER_LNG } from "@intencity/shared";

const MAP_BOOT_ZOOM = 14.2;
const MAP_SURFACE_BG = "#0b1017";
const MAP_CAMERA_KEY = "intencity-map-camera";
const STYLE_RELOAD_MAX_ATTEMPTS = 3;

function buildImperativeBootCamera(bootCenter?: { lat: number; lng: number } | null) {
  return {
    centerCoordinate: (bootCenter
      ? [bootCenter.lng, bootCenter.lat]
      : [MAP_FALLBACK_CENTER_LNG, MAP_FALLBACK_CENTER_LAT]) as [number, number],
    zoomLevel: MAP_BOOT_ZOOM,
    animationDuration: 0,
  };
}

export function isRnMapboxNativeAvailable(): boolean {
  return NativeModules.RNMBXModule != null;
}

type RnMapboxMaps = typeof import("@rnmapbox/maps");

function truncateLabel(name: string, max = 26): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function computeBounds(coords: VenuePublic[]): { ne: [number, number]; sw: [number, number] } | null {
  if (!coords.length) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const v of coords) {
    if (typeof v.lng !== "number" || !Number.isFinite(v.lng)) continue;
    if (typeof v.lat !== "number" || !Number.isFinite(v.lat)) continue;
    minLng = Math.min(minLng, v.lng);
    minLat = Math.min(minLat, v.lat);
    maxLng = Math.max(maxLng, v.lng);
    maxLat = Math.max(maxLat, v.lat);
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return { ne: [maxLng, maxLat], sw: [minLng, minLat] };
}

export type VenuesMapCanvasHandle = {
  /** PWA-equivalent `easeTo` — locate, checkpoint, initial center, venue focus. */
  applyCameraMove: (move: PwaCameraMove) => void;
  /** Milliseconds until programmatic camera moves finish (auto-tour idle). */
  programmaticCameraUntilMs: () => number;
  getCameraZoom: () => number;
};

export type VenuesMapCanvasProps = {
  accessToken: string;
  venues: VenuePublic[];
  /** User opened venue sheet — does not drive camera. */
  selectedVenueId: string | null;
  /** Active checkpoint / tour target — pin highlight only (not camera key). */
  highlightVenueId?: string | null;
  onSelectVenue: (venue: VenuePublic) => void;
  cameraRefitToken?: number;
  /** Imperative-only camera (PWA) — no venue-bounds refit after mount. */
  freezeDeclarativeCamera?: boolean;
  /** Device fix from expo-location (P2O-B) — camera/locate helpers, not friend markers. */
  youCoords?: { lat: number; lng: number } | null;
  /** EVOLVE-1 — local device puck (separate from DB-interpolated friends). */
  localYouMarker?: MapLocalYouMarker | null;
  /** MAP-B — friend avatar markers (excludes you when `localYouMarker` is set). */
  friendMarkers?: MapFriendPresenceMarker[];
  venueClusters?: MapVenuePresenceClusterModel[];
  onPressPresenceMarker?: (userId: string, isMe: boolean) => void;
  /** MAP-C — PWA `venues-activity-source` GeoJSON. */
  venueActivityGeoJson?: ReturnType<typeof import("../lib/mapVenueActivity").buildVenueActivityGeoJson>;
  /** MAP-C slice 2 — aggregate venue-hop trails. */
  districtFlowGeoJson?: ReturnType<
    typeof import("../lib/districtFlowTrails").buildDistrictFlowFeatureCollection
  > | null;
  /** Pan / touch on map resets auto-tour idle clock (PWA `pointerdown` on map container). */
  onMapUserPan?: () => void;
  /** Fires when Mapbox style has finished loading (PWA `mapReady`). */
  onMapStyleLoaded?: () => void;
  /** Seed imperative boot camera — snaps with `animationDuration: 0` when coords arrive. */
  bootCenter?: { lat: number; lng: number } | null;
  /** Gate pins, heat, and presence until map boot is settled (avoids pop-in). */
  showOverlays?: boolean;
};

export const VenuesMapCanvas = memo(
  forwardRef<VenuesMapCanvasHandle, VenuesMapCanvasProps>(function VenuesMapCanvas(
    {
      accessToken,
      venues,
      selectedVenueId,
      highlightVenueId = null,
      onSelectVenue,
      cameraRefitToken = 0,
      freezeDeclarativeCamera = true,
      youCoords = null,
      localYouMarker = null,
      friendMarkers = [],
      venueClusters = [],
      onPressPresenceMarker,
      venueActivityGeoJson,
      districtFlowGeoJson = null,
      onMapUserPan,
      onMapStyleLoaded,
      bootCenter = null,
      showOverlays = true,
    },
    ref
  ) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [cameraZoom, setCameraZoom] = useState(14);
  const [heatPulse, setHeatPulse] = useState(1);
  const [mapDayMode, setMapDayMode] = useState(() => localHourIsMapDaytime());
  const [styleUrl, setStyleUrl] = useState(() => mapStyleUrlForLocalClock());
  /** Basemap `existing` layer overrides — not used for heat/labels ShapeSources. */
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [loadedBasemapStyleUrl, setLoadedBasemapStyleUrl] = useState<string | null>(null);
  const frozenBootCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const [bootCenterApplied, setBootCenterApplied] = useState(false);
  const bootCameraAppliedRef = useRef(false);
  const styleReloadAttemptsRef = useRef(0);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const lastCameraRef = useRef({
    lng: MAP_FALLBACK_CENTER_LNG,
    lat: MAP_FALLBACK_CENTER_LAT,
    zoom: MAP_BOOT_ZOOM,
  });
  const [districtFlowDashTick, setDistrictFlowDashTick] = useState(0);
  const cameraRef = useRef<{ setCamera: (config: Record<string, unknown>) => void } | null>(null);
  const programmaticCameraUntilRef = useRef(0);
  /** Edge-trigger so we don't spam `onMapUserPan` every camera frame during a pan. */
  const userGestureActiveRef = useRef(false);
  const labelChrome = mapDayMode ? mapDayChrome : mapNightChrome;

  const mapbox = useMemo<RnMapboxMaps | null>(() => {
    if (!isRnMapboxNativeAvailable()) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Mbx = require("@rnmapbox/maps") as RnMapboxMaps;
    try {
      Mbx.setAccessToken(accessToken.trim());
    } catch {
      return null;
    }
    return Mbx;
  }, [accessToken]);

  const coords = useMemo(
    () =>
      venues.filter(
        (v) =>
          typeof v.lat === "number" &&
          Number.isFinite(v.lat) &&
          typeof v.lng === "number" &&
          Number.isFinite(v.lng)
      ),
    [venues]
  );

  const bounds = computeBounds(coords);
  const single = coords.length === 1 ? coords[0] : undefined;

  useEffect(() => {
    const syncStyle = () => {
      const day = localHourIsMapDaytime();
      const nextStyleUrl = mapStyleUrlForDayMode(day);
      setMapDayMode((prev) => (prev === day ? prev : day));
      setStyleUrl((prev) => (prev === nextStyleUrl ? prev : nextStyleUrl));
    };
    syncStyle();
    const id = setInterval(syncStyle, 60_000);
    return () => clearInterval(id);
  }, []);

  /** Branded `existing` layers need the style; heat/labels use their own ShapeSources (same as pins). */
  useEffect(() => {
    if (!mapbox) return;
    const fallback = setTimeout(() => {
      setStyleLoaded(true);
      setLoadedBasemapStyleUrl((prev) => prev ?? styleUrl);
    }, 2800);
    return () => clearTimeout(fallback);
  }, [mapbox, styleUrl]);

  const markMapStyleReady = useCallback(() => {
    styleReloadAttemptsRef.current = 0;
    setStyleLoaded(true);
    setLoadedBasemapStyleUrl(styleUrl);
    onMapStyleLoaded?.();
  }, [onMapStyleLoaded, styleUrl]);

  const retryStyleLoad = useCallback(() => {
    if (styleReloadAttemptsRef.current >= STYLE_RELOAD_MAX_ATTEMPTS) return;
    styleReloadAttemptsRef.current += 1;
    setStyleLoaded(false);
    setLoadedBasemapStyleUrl(null);
    bootCameraAppliedRef.current = false;
    setMapInstanceKey((k) => k + 1);
  }, []);

  const atmosphereZoom = Math.round(cameraZoom * 4) / 4;
  const atmosphereStyle = useMemo(
    () => mapAtmosphereStyleForDayMode(mapDayMode, atmosphereZoom),
    [mapDayMode, atmosphereZoom]
  );

  /** PWA heat breathe — 200ms `heatmap-intensity` wave. */
  useEffect(() => {
    const id = setInterval(() => {
      const wave = 0.88 + 0.12 * ((Math.sin(Date.now() / 520) + 1) / 2);
      setHeatPulse(wave);
    }, 200);
    return () => clearInterval(id);
  }, []);

  /** PWA presence marker lerp — single `requestAnimationFrame` loop. */
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      tickPresenceMarkerMotion();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const ids: string[] = [];
    for (const m of friendMarkers) {
      ids.push(m.userId);
      setPresenceMarkerTarget(m.userId, m.lng, m.lat);
    }
    if (localYouMarker) {
      ids.push(MAP_YOU_GPS_MARKER_ID);
      setPresenceMarkerTarget(MAP_YOU_GPS_MARKER_ID, localYouMarker.lng, localYouMarker.lat);
    }
    prunePresenceMarkerTargets(ids);
  }, [friendMarkers, localYouMarker]);

  const showPresence = shouldShowPresenceMarkers(cameraZoom);
  const heatIntensity = heatmapIntensityStyle(heatPulse);
  const heatmapOpacityStyleActive = heatmapOpacityStyle;

  const combinedCountByVenueId = useMemo(() => {
    const m = new Map<string, number>();
    if (!venueActivityGeoJson) return m;
    for (const f of venueActivityGeoJson.features) {
      m.set(f.properties.venueId, f.properties.combined_count);
    }
    return m;
  }, [venueActivityGeoJson]);

  const labelGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: coords.map((v) => ({
        type: "Feature" as const,
        id: v.id,
        properties: {
          id: v.id,
          title: truncateLabel(v.name),
          combined_count: combinedCountByVenueId.get(v.id) ?? 0,
        },
        geometry: { type: "Point" as const, coordinates: [v.lng as number, v.lat as number] },
      })),
    }),
    [coords, combinedCountByVenueId]
  );

  const applyCameraMove = useCallback((move: PwaCameraMove) => {
    applyPwaCameraMove(cameraRef.current?.setCamera, programmaticCameraUntilRef, move);
  }, []);

  const restoreLastCamera = useCallback(() => {
    if (!cameraRef.current) return;
    const { lng, lat, zoom } = lastCameraRef.current;
    cameraRef.current.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: zoom,
      animationDuration: 0,
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      applyCameraMove,
      programmaticCameraUntilMs: () => programmaticCameraUntilRef.current,
      getCameraZoom: () => cameraZoom,
    }),
    [applyCameraMove, cameraZoom]
  );

  const useDeclarativeCameraFit = !freezeDeclarativeCamera;

  useEffect(() => {
    if (!bootCenter || frozenBootCenterRef.current) return;
    frozenBootCenterRef.current = bootCenter;
    setBootCenterApplied(true);
  }, [bootCenter?.lat, bootCenter?.lng]);

  /** One boot snap on first coords — then release so GPS ticks don't re-center. */
  const mapDefaultSettings = useMemo(
    () => buildImperativeBootCamera(frozenBootCenterRef.current ?? bootCenter),
    [bootCenter?.lat, bootCenter?.lng, bootCenterApplied]
  );

  /** Imperative boot snap — never pass declarative Camera props after this (avoids blank resets). */
  useEffect(() => {
    if (!freezeDeclarativeCamera || !bootCenterApplied || bootCameraAppliedRef.current) return;
    bootCameraAppliedRef.current = true;
    const boot = buildImperativeBootCamera(frozenBootCenterRef.current);
    lastCameraRef.current = {
      lng: boot.centerCoordinate[0],
      lat: boot.centerCoordinate[1],
      zoom: boot.zoomLevel,
    };
    const id = requestAnimationFrame(() => {
      cameraRef.current?.setCamera(boot);
    });
    return () => cancelAnimationFrame(id);
  }, [bootCenterApplied, freezeDeclarativeCamera]);

  const recoverMapSurface = useCallback(() => {
    requestAnimationFrame(() => {
      restoreLastCamera();
      if (styleLoaded) {
        setLoadedBasemapStyleUrl(styleUrl);
      }
    });
  }, [restoreLastCamera, styleLoaded, styleUrl]);

  /** Recover from GL surface loss after backgrounding — common source of a blank map tile. */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      recoverMapSurface();
    });
    return () => sub.remove();
  }, [recoverMapSurface]);

  useFocusEffect(
    useCallback(() => {
      recoverMapSurface();
    }, [recoverMapSurface])
  );

  const cameraKey = useMemo(() => {
    if (freezeDeclarativeCamera) return "map-imperative";
    if (coords.length === 0) return `empty.${cameraRefitToken}`;
    const b =
      coords.length <= 1
        ? `${single?.lng}-${single?.lat}`
        : `${bounds?.ne.join(",")}-${bounds?.sw.join(",")}`;
    return `${coords.length}.${b}.${cameraRefitToken}`;
  }, [
    bounds?.ne,
    bounds?.sw,
    cameraRefitToken,
    coords.length,
    freezeDeclarativeCamera,
    single?.lat,
    single?.lng,
  ]);

  const pinHighlightId = highlightVenueId ?? selectedVenueId;

  const onLayoutCanvas = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDimensions({ width, height });
  }, []);

  const showDistrictFlow =
    showOverlays &&
    cameraZoom < DISTRICT_FLOW_MAX_ZOOM &&
    districtFlowGeoJson != null &&
    districtFlowGeoJson.features.length > 0;

  const showVenueLabels = showOverlays && shouldShowVenueNameLabels(cameraZoom) && coords.length > 0;
  const showVenueActivityLayers = showOverlays && Boolean(venueActivityGeoJson?.features?.length);
  const showDistrictFlowLayers = showDistrictFlow;
  const showPresenceOverlays = showOverlays && showPresence;
  const showVenuePins = showOverlays;

  /** PWA district-flow dash march — 96ms `line-dashoffset`. */
  useEffect(() => {
    if (!showDistrictFlow) return;
    const id = setInterval(() => setDistrictFlowDashTick((n) => n + 1), 96);
    return () => clearInterval(id);
  }, [showDistrictFlow]);

  const districtFlowGlowStyle = useMemo(
    () => districtFlowGlowLineStyleAnimated(Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives dashoffset only
    [districtFlowDashTick, showDistrictFlow]
  );
  const districtFlowCoreStyle = useMemo(
    () => districtFlowCoreLineStyleAnimated(Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [districtFlowDashTick, showDistrictFlow]
  );

  if (!mapbox) {
    return (
      <View style={styles.fill}>
        <View style={styles.surfaceUnderlay} />
      </View>
    );
  }

  const basemapLayersReady = styleLoaded && loadedBasemapStyleUrl === styleUrl;

  const {
    MapView,
    Camera,
    MarkerView,
    ShapeSource,
    SymbolLayer,
    HeatmapLayer,
    CircleLayer,
    LineLayer,
    Atmosphere,
    BackgroundLayer,
    FillLayer,
    FillExtrusionLayer,
  } = mapbox as RnMapboxMaps & {
      HeatmapLayer?: React.ComponentType<{
        id: string;
        style?: Record<string, unknown>;
      }>;
      CircleLayer?: React.ComponentType<{
        id: string;
        style?: Record<string, unknown>;
      }>;
      LineLayer?: React.ComponentType<{
        id: string;
        style?: Record<string, unknown>;
      }>;
      Atmosphere?: React.ComponentType<{
        style?: Record<string, unknown>;
      }>;
      BackgroundLayer?: React.ComponentType<{
        id: string;
        existing?: boolean;
        style?: Record<string, unknown>;
      }>;
      FillLayer?: React.ComponentType<{
        id: string;
        existing?: boolean;
        style?: Record<string, unknown>;
      }>;
      FillExtrusionLayer?: React.ComponentType<{
        id: string;
        existing?: boolean;
        style?: Record<string, unknown>;
      }>;
    };

  const cameraFit = coords.length === 0
      ? {
          centerCoordinate: [-75.17, 39.95] as [number, number],
          zoomLevel: 11.5,
          animationDuration: 400,
        }
      : coords.length === 1
        ? {
            centerCoordinate: [single!.lng!, single!.lat!] as [number, number],
            zoomLevel: 14.2,
            animationDuration: 400,
          }
        : {
            bounds: { ne: bounds!.ne, sw: bounds!.sw },
            padding: {
              paddingTop: dimensions.height > 0 ? Math.round(dimensions.height * 0.32) : 80,
              paddingBottom: dimensions.height > 0 ? Math.round(dimensions.height * 0.36) : 96,
              paddingLeft: 24,
              paddingRight: 24,
            },
            animationDuration: 450,
          };

  return (
    <View style={styles.fill} onLayout={onLayoutCanvas}>
      <View style={styles.surfaceUnderlay} pointerEvents="none" />
      <MapView
        key={`intencity-map-${mapInstanceKey}`}
        style={styles.mapSurface}
        styleURL={styleUrl}
        projection="globe"
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        defaultSettings={mapDefaultSettings}
        onPress={() => onMapUserPan?.()}
        onCameraChanged={(e) => {
          const z = e.properties?.zoom;
          if (typeof z === "number" && Number.isFinite(z)) {
            setCameraZoom(z);
            lastCameraRef.current.zoom = z;
          }
          const center = e.properties?.center;
          if (Array.isArray(center) && center.length >= 2) {
            const lng = center[0];
            const lat = center[1];
            if (typeof lng === "number" && typeof lat === "number" && Number.isFinite(lng) && Number.isFinite(lat)) {
              lastCameraRef.current.lng = lng;
              lastCameraRef.current.lat = lat;
            }
          }
          const gestureActive = e.gestures?.isGestureActive === true;
          if (gestureActive && !userGestureActiveRef.current) {
            if (Date.now() >= programmaticCameraUntilRef.current) {
              onMapUserPan?.();
            }
          }
          userGestureActiveRef.current = gestureActive;
        }}
        onDidFinishLoadingMap={markMapStyleReady}
        onDidFinishLoadingStyle={markMapStyleReady}
        onDidFailLoadingMap={retryStyleLoad}
      >
        {Atmosphere ? <Atmosphere style={atmosphereStyle} /> : null}
        {basemapLayersReady && BackgroundLayer && FillLayer && LineLayer && SymbolLayer ? (
          <MapBrandedBasemapLayers
            key={loadedBasemapStyleUrl ?? styleUrl}
            dayMode={mapDayMode}
            layers={{
              BackgroundLayer,
              FillLayer,
              LineLayer,
              SymbolLayer,
              FillExtrusionLayer,
            }}
          />
        ) : null}
        {/* Ref used for imperative locate only — partial CameraRef surface */}
        {useDeclarativeCameraFit ? (
          // @ts-expect-error RN Mapbox CameraRef vs narrow imperative locate ref
          <Camera ref={cameraRef} key={cameraKey} {...cameraFit} />
        ) : (
          // @ts-expect-error RN Mapbox CameraRef vs narrow imperative locate ref
          <Camera ref={cameraRef} key={MAP_CAMERA_KEY} />
        )}
        {showDistrictFlowLayers && LineLayer && districtFlowGeoJson ? (
          <ShapeSource id="intencityDistrictFlow" shape={districtFlowGeoJson as never}>
            <LineLayer id="intencityDistrictFlowGlow" style={districtFlowGlowStyle as never} />
            <LineLayer id="intencityDistrictFlowCore" style={districtFlowCoreStyle as never} />
          </ShapeSource>
        ) : null}
        {showVenueActivityLayers && HeatmapLayer && CircleLayer ? (
          <ShapeSource id="intencityVenueActivity" shape={venueActivityGeoJson}>
            <HeatmapLayer
              id="intencityVenueHeat"
              style={{
                heatmapWeight: 0,
                heatmapIntensity: heatIntensity as never,
                heatmapRadius: heatmapRadiusStyle as never,
                heatmapOpacity: heatmapOpacityStyleActive as never,
                heatmapColor: heatmapColorStyle as never,
              }}
            />
            <CircleLayer
              id="intencityVenueGlow"
              style={{
                circleColor: venueGlowColorStyle as never,
                circleRadius: venueGlowCircleRadiusStyle as never,
                circleBlur: 0.9,
                circleOpacity: venueGlowCircleOpacityStyle as never,
                circlePitchAlignment: "map",
              }}
            />
            <CircleLayer
              id="intencityVenueCore"
              style={{
                circleColor: venueGlowColorStyle as never,
                circleRadius: venueCoreCircleRadiusStyle as never,
                circleBlur: 0.25,
                circleOpacity: [
                  "case",
                  ["==", ["coalesce", ["get", "checkpoint_active"], 0], 1],
                  0,
                  0,
                ],
                circlePitchAlignment: "map",
              }}
            />
          </ShapeSource>
        ) : null}
        {showPresenceOverlays && localYouMarker ? (
          <MapSmoothPresenceMarker
            key="presence-you-gps"
            marker={{
              userId: MAP_YOU_GPS_MARKER_ID,
              lng: localYouMarker.lng,
              lat: localYouMarker.lat,
              label: localYouMarker.label,
              avatarUrl: localYouMarker.avatarUrl,
              isMe: true,
              isLive: true,
              isOnlineNow: true,
              updatedAt: new Date().toISOString(),
            }}
            mapZoom={cameraZoom}
            MarkerView={MarkerView}
            onPress={() => onPressPresenceMarker?.(localYouMarker.userId, true)}
          />
        ) : null}
        {showPresenceOverlays
          ? friendMarkers.map((m) => (
              <MapSmoothPresenceMarker
                key={`presence-${m.userId}`}
                marker={m}
                mapZoom={cameraZoom}
                MarkerView={MarkerView}
                lastSeenLabel={
                  !m.isLive && m.updatedAt ? formatMapMarkerLastSeen(m.updatedAt) : undefined
                }
                onPress={() => onPressPresenceMarker?.(m.userId, m.isMe)}
              />
            ))
          : null}
        {showPresenceOverlays
          ? venueClusters.map((c) => {
              const combined = combinedCountByVenueId.get(c.venueId) ?? 0;
              const clusterOpacity = categoryPinOpacityForZoom(cameraZoom, combined);
              if (clusterOpacity <= 0) return null;
              const selected = pinHighlightId === c.venueId;
              const clusterOffset = venuePresenceClusterOffsetForZoom(cameraZoom, selected);
              return (
                <MarkerView
                  key={`venue-cluster-${c.venueId}`}
                  coordinate={[c.lng, c.lat]}
                  anchor={{ x: 0.5, y: 0.5 }}
                  allowOverlap
                >
                  <View
                    style={{
                      opacity: clusterOpacity,
                      transform: [
                        { translateX: clusterOffset.translateX },
                        { translateY: clusterOffset.translateY },
                      ],
                    }}
                    pointerEvents={clusterOpacity < 0.12 ? "none" : "auto"}
                  >
                    <MapVenuePresenceCluster
                      members={c.members}
                      mapZoom={cameraZoom}
                      onPress={() => onSelectVenue(c.venue)}
                    />
                  </View>
                </MarkerView>
              );
            })
          : null}
        {showVenueLabels ? (
          <ShapeSource id="intencityVenueLabels" shape={labelGeoJson}>
            <SymbolLayer
              id="intencityVenueNames"
              style={{
                textField: ["get", "title"],
                textSize: 11,
                textColor: labelChrome.venueLabelColor,
                textHaloColor: labelChrome.venueLabelHalo,
                textHaloWidth: 2.5,
                textAnchor: "top",
                textOffset: [0, 1.55],
                textOptional: true,
                textIgnorePlacement: true,
                textAllowOverlap: true,
                textLetterSpacing: 0.03,
                textOpacity: venuePinLabelOpacityStyle as never,
              }}
            />
          </ShapeSource>
        ) : null}
        {showVenuePins ? coords.map((v) => {
          const selected = pinHighlightId === v.id;
          const categoryKey = resolveVenueCategoryAccentKey(v);
          const combined = combinedCountByVenueId.get(v.id) ?? 0;
          const pinOpacity = categoryPinOpacityForZoom(cameraZoom, combined);
          if (pinOpacity <= 0) return null;
          const pinSize = categoryPinIconSizeForZoom(cameraZoom, selected);
          return (
            <MarkerView
              key={`${v.id}-${categoryKey}-${selected ? "s" : "n"}`}
              coordinate={[v.lng as number, v.lat as number]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
            >
              <View style={styles.markerHit} pointerEvents="box-none">
                <Pressable
                  onPress={() => onSelectVenue(v)}
                  style={styles.markerPress}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={v.name}
                >
                  <MapCategoryPin
                    category={v.category}
                    name={v.name}
                    selected={selected}
                    opacity={pinOpacity}
                    iconSize={pinSize}
                  />
                </Pressable>
              </View>
            </MarkerView>
          );
        }) : null}
      </MapView>
    </View>
  );
  })
);


const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: MAP_SURFACE_BG,
  },
  surfaceUnderlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MAP_SURFACE_BG,
  },
  mapSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MAP_SURFACE_BG,
  },
  markerHit: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerPress: {
    alignItems: "center",
    justifyContent: "center",
  },
});
