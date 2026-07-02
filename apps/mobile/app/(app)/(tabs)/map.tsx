import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import { AppState, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapAtmosphereOverlay } from "../../../src/components/map/MapAtmosphereOverlay";
import { markMapBootReady } from "../../../src/lib/mapBootGate";
import { MapCategoryFilterTray } from "../../../src/components/map/MapCategoryFilterTray";
import { MapCheckpointBar } from "../../../src/components/map/MapCheckpointBar";
import { MapSecondaryControls } from "../../../src/components/map/MapSecondaryControls";
import { AtVenueIndicator } from "../../../src/components/presence/AtVenueIndicator";
import {
  isRnMapboxNativeAvailable,
  VenuesMapCanvas,
  type VenuesMapCanvasHandle,
} from "../../../src/components/VenuesMapCanvas";
import { useAcceptedFriends } from "../../../src/hooks/useAcceptedFriends";
import { useForegroundLocation } from "../../../src/hooks/useForegroundLocation";
import { resolveMapBootCenterSeed, resolveMapYouCoords } from "../../../src/lib/mapBootCenter";
import { getCachedMapLastLocation } from "../../../src/lib/mapLastLocationCache";
import { presenceNowMs } from "../../../src/lib/presenceNowMs";
import { useVenuesPreview } from "../../../src/hooks/useVenuesPreview";
import {
  getFriendPresenceCopyFromRow,
  isFriendOnlineNow,
  isLikelyMapFallbackPresence,
  isValidCoordinatePair,
} from "@intencity/shared";
import { readMapAutoVenueTourEnabled } from "../../../src/lib/mapAutoTourPreference";
import type { UserPresenceRow } from "../../../src/types/presence";
import {
  resolveLocateCycleStep,
  resolveMapLocateTarget,
} from "../../../src/lib/mapLocateTarget";
import {
  computeMapPresenceMarkers,
  isCoordsInVenueMapAirspace,
} from "../../../src/lib/mapPresenceMarkers";
import { buildVenueActivityGeoJson } from "../../../src/lib/mapVenueActivity";
import {
  buildMapCheckpoints,
  getVenueSheetPeople,
  getVenueSheetPresenceStats,
} from "../../../src/lib/venuePresenceStats";
import { useMyAvatar } from "../../../src/hooks/useMyAvatar";
import { useMyProfile } from "../../../src/hooks/useMyProfile";
import { useMyVenuePresence } from "../../../src/hooks/useMyVenuePresence";
import { useMapPresenceRefresh } from "../../../src/hooks/useMapPresenceRefresh";
import { useAppLifecycle } from "../../../src/providers/AppLifecycleProvider";
import { usePresence } from "../../../src/providers/PresenceProvider";
import {
  applyDistrictFlowFromPresence,
  buildDistrictFlowFeatureCollection,
  decayDistrictFlowState,
  type DistrictFlowPresence,
  type DistrictFlowState,
  type DistrictFlowVenue,
} from "../../../src/lib/districtFlowTrails";
import {
  AUTO_TOUR_ARROW_GRACE_MS,
  AUTO_TOUR_IDLE_GRACE_MS,
  AUTO_TOUR_REPEAT_MS,
  CHECKPOINT_ARRIVAL_PULSE_MS,
} from "../../../src/lib/mapAutoTour";
import { getMapboxAccessToken } from "../../../src/lib/env";
import { venueMatchesMapFilter, type VenueCategoryAccentKey } from "../../../src/lib/venueCategoryAccent";
import {
  MAP_TOP_OVERLAY_COLUMN_MIN_HEIGHT,
  mapCheckpointBarBottom,
  mapTopOverlayPaddingTop,
} from "../../../src/theme/mapChrome";
import type { VenuePublic } from "../../../src/types/venue";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useMapVenueSheet } from "../../../src/providers/MapVenueSheetProvider";
import { colors } from "../../../src/theme/colors";
import { profileUsernameLabel } from "../../../src/lib/profileDisplay";
import { recordMapIntroSeen, shouldShowMapIntro } from "../../../src/lib/mapIntroPreference";
import { MapIntroCoach } from "../../../src/components/map/MapIntroCoach";

const OVERLAY_W = Math.min(Dimensions.get("window").width * 0.94, 420);
/** PWA checkpoint portal `min(92vw, 460px)`. */
const CHECKPOINT_W = Math.min(Dimensions.get("window").width * 0.92, 460);
const MAP_SETTLE_FAILSAFE_MS = 4200;
const MAP_AVATAR_PREFETCH_CAP_MS = 900;

export default function MapTabScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId?: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const mapboxToken = getMapboxAccessToken();
  const nativeMapReady = Boolean(mapboxToken) && isRnMapboxNativeAvailable();
  const { venues, loading: venuesLoading, error: venuesError } = useVenuesPreview(Boolean(user?.id));
  const { friends, loading: friendsLoading } = useAcceptedFriends(user?.id);
  const {
    presence,
    presenceLoading,
    presenceInitialSyncDone,
    ghostByUserId,
    blockedUserIds,
    friendIdSet,
    presenceClock,
  } = usePresence();
  const { avatarUrl: myAvatarUrl, username: myUsername, showProfileAvatar } = useMyAvatar();
  const { profile: myProfile, refresh: refreshMyProfile } = useMyProfile(user?.id);

  const { isAppForeground } = useAppLifecycle();
  const { sheetVenueId, sheetOpen, openMapVenueSheet, closeMapVenueSheet } = useMapVenueSheet();
  const [activeCategory, setActiveCategory] = useState<VenueCategoryAccentKey>("all");
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [checkpointMotionEnabled, setCheckpointMotionEnabled] = useState(false);
  const [arrivalPulseVenueId, setArrivalPulseVenueId] = useState<string | null>(null);
  const [arrivalPulseUntil, setArrivalPulseUntil] = useState(0);
  const [arrivalPulseTick, setArrivalPulseTick] = useState(0);
  const mapCanvasRef = useRef<VenuesMapCanvasHandle>(null);
  const locateCycleStepRef = useRef<0 | 1>(0);
  const didAutoCenterYouRef = useRef(false);
  const [hasInitialMapCenter, setHasInitialMapCenter] = useState(false);
  const locateRefreshInFlightRef = useRef(false);
  const tourIdleSinceRef = useRef(Date.now());
  const autoTourPausedUntilRef = useRef(0);
  const lastAutoTourHopAtRef = useRef(0);
  const lastArrowPressAtRef = useRef(0);
  const [autoTourEnabled, setAutoTourEnabled] = useState(true);
  const districtFlowStateRef = useRef<DistrictFlowState>({
    anchorByUser: new Map(),
    edges: new Map(),
  });
  const [mapIntroVisible, setMapIntroVisible] = useState(false);
  const mapIntroGateDoneRef = useRef(false);
  const [mapTabFocused, setMapTabFocused] = useState(true);
  const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
  const [mapSettleForced, setMapSettleForced] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setMapTabFocused(true);
      return () => setMapTabFocused(false);
    }, [])
  );
  useMapPresenceRefresh(mapTabFocused && Boolean(user?.id));
  const { permission: locationPermission, coords: youCoords, refresh: refreshLocation } =
    useForegroundLocation(Boolean(user?.id) && nativeMapReady && isAppForeground, {
      highPrecision: mapTabFocused && isAppForeground,
    });
  const myVenue = useMyVenuePresence(user?.id, venues, {
    youCoords: locationPermission === "granted" ? youCoords : null,
  });

  const filteredVenues = useMemo(
    () => venues.filter((v) => venueMatchesMapFilter(v.category, v.name, activeCategory)),
    [venues, activeCategory]
  );

  const geoVenues = useMemo(
    () =>
      filteredVenues.filter(
        (v) =>
          typeof v.lat === "number" &&
          Number.isFinite(v.lat) &&
          typeof v.lng === "number" &&
          Number.isFinite(v.lng)
      ),
    [filteredVenues]
  );

  const sortedCheckpoints = useMemo(
    () =>
      buildMapCheckpoints(
        geoVenues,
        presence,
        friendIdSet,
        user?.id ?? null,
        ghostByUserId,
        youCoords,
        blockedUserIds,
        Date.now(),
        !!myProfile?.ghost_mode
      ),
    [geoVenues, presence, friendIdSet, user?.id, ghostByUserId, youCoords, blockedUserIds, presenceClock, myProfile?.ghost_mode]
  );

  const checkpoints = useMemo(() => sortedCheckpoints.map((c) => c.venue), [sortedCheckpoints]);

  const activeCheckpoint = checkpoints.length
    ? checkpoints[((checkpointIndex % checkpoints.length) + checkpoints.length) % checkpoints.length]
    : null;

  const activeCheckpointActivity = useMemo(() => {
    if (!activeCheckpoint) return 0;
    return sortedCheckpoints.find((c) => c.venue.id === activeCheckpoint.id)?.activity ?? 0;
  }, [activeCheckpoint, sortedCheckpoints]);

  const venueActivityGeoJson = useMemo(
    () =>
      buildVenueActivityGeoJson({
        venues: geoVenues,
        presence,
        friendIds: friendIdSet,
        meId: user?.id ?? null,
        ghostByUserId,
        blockedUserIds,
        activeCheckpointId: activeCheckpoint?.id ?? null,
        arrivalPulseVenueId,
        arrivalPulseUntilMs: arrivalPulseUntil,
        nowMs: Date.now(),
        myGhostMode: !!myProfile?.ghost_mode,
      }),
    [
      geoVenues,
      presence,
      friendIdSet,
      user?.id,
      ghostByUserId,
      blockedUserIds,
      activeCheckpoint?.id,
      presenceClock,
      arrivalPulseVenueId,
      arrivalPulseUntil,
      arrivalPulseTick,
      myProfile?.ghost_mode,
    ]
  );

  const districtFlowVenues = useMemo(
    (): DistrictFlowVenue[] =>
      geoVenues
        .filter((v) => v.lat != null && v.lng != null)
        .map((v) => ({
          id: v.id,
          lat: v.lat as number,
          lng: v.lng as number,
          outer_radius_m: v.outer_radius_m ?? 200,
        })),
    [geoVenues]
  );

  const districtFlowPresenceRows = useMemo((): DistrictFlowPresence[] => {
    return presence.map((p) => ({
      user_id: p.user_id,
      lng: p.lng,
      lat: p.lat,
      updated_at: p.updated_at,
      venue_id: p.venue_id,
      venue_state: null,
      zone_type: null,
    }));
  }, [presence]);

  const [districtFlowTick, setDistrictFlowTick] = useState(0);

  const districtFlowGeoJson = useMemo(() => {
    void districtFlowTick;
    return buildDistrictFlowFeatureCollection(
      districtFlowStateRef.current,
      districtFlowVenues,
      Date.now()
    );
  }, [districtFlowVenues, districtFlowTick, presenceClock]);

  const venueNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of venues) m.set(v.id, v.name);
    return m;
  }, [venues]);

  const selectedVenue = useMemo(() => {
    if (!sheetVenueId) return null;
    return venues.find((v) => v.id === sheetVenueId) ?? null;
  }, [sheetVenueId, venues]);

  const topOverlayPaddingTop = mapTopOverlayPaddingTop(insets);
  /** PWA: checkpoint bar bottom only (no browse list above bar). */
  const checkpointBarBottom = mapCheckpointBarBottom(insets);
  /** Float “Here” pill just above the checkpoint swiper. */
  const atVenuePillBottom = checkpointBarBottom + 58;

  const friendProfiles = useMemo(
    () =>
      friends.map((f) => ({
        id: f.id,
        label: profileUsernameLabel(f, "Friend"),
        avatar_url: f.avatar_url,
      })),
    [friends]
  );

  const selfPresenceCoords = useMemo(() => {
    if (!user?.id) return null;
    const mine = presence.find((p) => p.user_id === user.id);
    if (typeof mine?.lat !== "number" || typeof mine?.lng !== "number") return null;
    if (!Number.isFinite(mine.lat) || !Number.isFinite(mine.lng)) return null;
    return { lat: mine.lat, lng: mine.lng };
  }, [presence, user?.id]);

  const effectiveYouCoords = useMemo(
    () =>
      resolveMapYouCoords({
        permission: locationPermission,
        youCoords,
        cachedLocation: getCachedMapLastLocation(),
        selfPresence: selfPresenceCoords,
      }),
    [locationPermission, youCoords, selfPresenceCoords]
  );

  const localYouMarker = useMemo(() => {
    if (!user?.id || !effectiveYouCoords) return null;
    if (isCoordsInVenueMapAirspace(effectiveYouCoords.lat, effectiveYouCoords.lng, geoVenues)) {
      return null;
    }
    return {
      userId: user.id,
      lat: effectiveYouCoords.lat,
      lng: effectiveYouCoords.lng,
      label: myUsername?.trim() || "You",
      avatarUrl: showProfileAvatar ? myAvatarUrl : null,
    };
  }, [
    user?.id,
    effectiveYouCoords,
    geoVenues,
    myUsername,
    showProfileAvatar,
    myAvatarUrl,
  ]);

  const { friendMarkers, venueClusters } = useMemo(
    () =>
      computeMapPresenceMarkers({
        venues: geoVenues,
        presence,
        friends: friendProfiles,
        meId: user?.id ?? null,
        myLabel: myUsername?.trim() || "You",
        myAvatarUrl: myAvatarUrl,
        myGhostMode: !!myProfile?.ghost_mode,
        ghostByUserId,
        blockedUserIds,
        youCoords: locationPermission === "denied" ? null : effectiveYouCoords,
        nowMs: presenceNowMs(),
      }),
    [
      geoVenues,
      presence,
      friendProfiles,
      user?.id,
      myUsername,
      myAvatarUrl,
      myProfile?.ghost_mode,
      ghostByUserId,
      blockedUserIds,
      locationPermission,
      effectiveYouCoords,
      presenceClock,
    ]
  );

  const onPressPresenceMarker = useCallback(
    (userId: string, isMe: boolean) => {
      if (isMe) {
        router.push("/profile");
        return;
      }
      const f = friends.find((x) => x.id === userId);
      const un = f?.username?.trim();
      if (un) router.push({ pathname: "/u/[username]", params: { username: un } });
    },
    [friends, router]
  );

  /** First map open only — live GPS updates must not re-seed the boot camera. */
  const mapBootCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapBootSeed = resolveMapBootCenterSeed({
    youCoords,
    cachedLocation: getCachedMapLastLocation(),
    selfPresence: selfPresenceCoords,
    venues: geoVenues,
  });
  if (mapBootSeed && !mapBootCenterRef.current) {
    mapBootCenterRef.current = mapBootSeed;
  }
  const mapBootCenter = mapBootCenterRef.current;
  const mapSettledOnceRef = useRef(false);
  const [mapRevealReady, setMapRevealReady] = useState(false);
  const mapDataReady = geoVenues.length > 0 && !venuesLoading;
  const mapAnchorReady = mapBootCenter != null;
  const mapSocialDataReady =
    presenceInitialSyncDone && !presenceLoading && !friendsLoading;
  const [mapSocialAssetsReady, setMapSocialAssetsReady] = useState(false);

  useEffect(() => {
    if (!mapSocialDataReady) {
      setMapSocialAssetsReady(false);
      return;
    }

    const urls = new Set<string>();
    if (localYouMarker?.avatarUrl) urls.add(localYouMarker.avatarUrl);
    for (const marker of friendMarkers) {
      if (marker.avatarUrl) urls.add(marker.avatarUrl);
    }

    if (urls.size === 0) {
      setMapSocialAssetsReady(true);
      return;
    }

    let cancelled = false;
    const cap = setTimeout(() => {
      if (!cancelled) setMapSocialAssetsReady(true);
    }, MAP_AVATAR_PREFETCH_CAP_MS);

    void Promise.all([...urls].map((url) => Image.prefetch(url))).finally(() => {
      if (!cancelled) {
        clearTimeout(cap);
        setMapSocialAssetsReady(true);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
  }, [mapSocialDataReady, localYouMarker, friendMarkers]);

  const mapReadyCore =
    mapStyleLoaded &&
    mapDataReady &&
    mapAnchorReady &&
    mapSocialDataReady &&
    mapSocialAssetsReady;

  useEffect(() => {
    if (!mapReadyCore) {
      setMapRevealReady(false);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMapRevealReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [mapReadyCore]);

  if (mapRevealReady) mapSettledOnceRef.current = true;
  const mapSettled = mapSettleForced || mapSettledOnceRef.current;

  useEffect(() => {
    if (mapSettled) markMapBootReady();
  }, [mapSettled]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !mapSettled || mapIntroGateDoneRef.current) return;

      let cancelled = false;

      void (async () => {
        const show = await shouldShowMapIntro(user.id);
        if (cancelled) return;

        if (!show) {
          mapIntroGateDoneRef.current = true;
          return;
        }

        await recordMapIntroSeen(user.id);
        if (cancelled) return;

        mapIntroGateDoneRef.current = true;

        await new Promise((resolve) => setTimeout(resolve, 450));
        if (cancelled) return;

        setMapIntroVisible(true);
      })();

      return () => {
        cancelled = true;
      };
    }, [user?.id, mapSettled])
  );

  const dismissMapIntro = useCallback(() => {
    setMapIntroVisible(false);
  }, []);

  useEffect(() => {
    if (!myAvatarUrl) return;
    void Image.prefetch(myAvatarUrl);
  }, [myAvatarUrl]);

  useEffect(() => {
    const id = setTimeout(() => {
      setMapSettleForced(true);
      setMapStyleLoaded(true);
    }, MAP_SETTLE_FAILSAFE_MS);
    return () => clearTimeout(id);
  }, []);

  const onMapStyleLoaded = useCallback(() => {
    setMapStyleLoaded(true);
  }, []);

  const friendRows = useMemo(() => {
    const nowMs = presenceNowMs();
    return friends.map((f) => {
      const rows = presence.filter((p) => p.user_id === f.id);
      const row = rows.reduce<(typeof rows)[0] | null>((best, p) => {
        if (!best) return p;
        return new Date(p.updated_at).getTime() > new Date(best.updated_at).getTime() ? p : best;
      }, null);
      const hasRealLocation =
        !!row &&
        isValidCoordinatePair(row.lat, row.lng) &&
        !isLikelyMapFallbackPresence(row.lat, row.lng);
      const online = row && hasRealLocation ? isFriendOnlineNow(row.updated_at, nowMs) : false;
      const subtitle = !hasRealLocation
        ? "No location"
        : getFriendPresenceCopyFromRow(row, venues, "map", undefined, nowMs).copy;
      return {
        id: f.id,
        label: profileUsernameLabel(f, "Friend"),
        avatar_url: f.avatar_url,
        subtitle,
        canFocus: hasRealLocation,
        isOnline: online,
      };
    });
  }, [friends, presence, presenceClock, venues]);

  const resetTourIdle = useCallback(() => {
    const now = Date.now();
    tourIdleSinceRef.current = now;
    lastAutoTourHopAtRef.current = 0;
    autoTourPausedUntilRef.current = now;
  }, []);

  useFocusEffect(
    useCallback(() => {
      void readMapAutoVenueTourEnabled().then(setAutoTourEnabled);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (!nativeMapReady) return;
      void refreshLocation({ balanced: true });
    }, [nativeMapReady, refreshLocation])
  );

  const focusFriendOnMap = useCallback(
    (friendId: string) => {
      closeMapVenueSheet();
      resetTourIdle();
      const rows = presence.filter((p) => p.user_id === friendId);
      const pres = rows.reduce<UserPresenceRow | null>((best, p) => {
        if (!best) return p;
        return new Date(p.updated_at).getTime() > new Date(best.updated_at).getTime() ? p : best;
      }, null);
      if (!pres) return;

      if (pres.venue_id) {
        const v = geoVenues.find((ven) => ven.id === pres.venue_id);
        if (
          v?.lat != null &&
          v.lng != null &&
          isValidCoordinatePair(v.lat, v.lng)
        ) {
          const z = mapCanvasRef.current?.getCameraZoom() ?? 14;
          mapCanvasRef.current?.applyCameraMove({
            kind: "friend-focus",
            lat: v.lat,
            lng: v.lng,
            currentZoom: z,
            atVenue: true,
          });
          return;
        }
      }

      if (
        typeof pres.lat === "number" &&
        typeof pres.lng === "number" &&
        isValidCoordinatePair(pres.lat, pres.lng) &&
        !isLikelyMapFallbackPresence(pres.lat, pres.lng)
      ) {
        const z = mapCanvasRef.current?.getCameraZoom() ?? 14;
        mapCanvasRef.current?.applyCameraMove({
          kind: "friend-focus",
          lat: pres.lat,
          lng: pres.lng,
          currentZoom: z,
          atVenue: false,
        });
      }
    },
    [closeMapVenueSheet, geoVenues, presence, resetTourIdle]
  );

  const syncOpenVenueSheet = useCallback(
    (venue: VenuePublic) => {
      const nowMs = presenceNowMs();
      openMapVenueSheet({
        venue,
        presenceStats: getVenueSheetPresenceStats(
          venue,
          presence,
          friendIdSet,
          user?.id ?? null,
          ghostByUserId,
          nowMs,
          blockedUserIds,
          !!myProfile?.ghost_mode
        ),
        venuePeople: getVenueSheetPeople(
          venue,
          presence,
          friendProfiles,
          user?.id ?? null,
          ghostByUserId,
          nowMs,
          blockedUserIds,
          !!myProfile?.ghost_mode
        ),
        youAreHere: myVenue.venue?.id === venue.id && myVenue.isAtVenue,
        youAreHereLive: myVenue.isLiveHere,
        youAreHereSettling: myVenue.isSettlingHere,
        onFocusFriend: focusFriendOnMap,
        onInteraction: resetTourIdle,
      });
    },
    [
      blockedUserIds,
      focusFriendOnMap,
      friendIdSet,
      friendProfiles,
      ghostByUserId,
      myVenue.isAtVenue,
      myVenue.isLiveHere,
      myVenue.isSettlingHere,
      myVenue.venue?.id,
      myProfile?.ghost_mode,
      openMapVenueSheet,
      presence,
      presenceClock,
      resetTourIdle,
      user?.id,
    ]
  );

  const openVenueSheet = useCallback(
    (venue: VenuePublic) => {
      resetTourIdle();
      syncOpenVenueSheet(venue);
    },
    [resetTourIdle, syncOpenVenueSheet]
  );

  useEffect(() => {
    if (!sheetOpen || !selectedVenue) return;
    syncOpenVenueSheet(selectedVenue);
  }, [selectedVenue, sheetOpen, syncOpenVenueSheet]);

  const handledQueryVenueIdRef = useRef<string | null>(null);

  useEffect(() => {
    const vid = typeof params.venueId === "string" ? params.venueId : undefined;
    if (!vid) return;
    const hit = venues.find((v) => v.id === vid);
    if (!hit) return;
    if (handledQueryVenueIdRef.current === vid) return;
    handledQueryVenueIdRef.current = vid;
    openVenueSheet(hit);
    if (hit.lat != null && hit.lng != null) {
      resetTourIdle();
      const z = mapCanvasRef.current?.getCameraZoom() ?? 14;
      mapCanvasRef.current?.applyCameraMove({
        kind: "venue-focus",
        lat: hit.lat,
        lng: hit.lng,
        currentZoom: z,
      });
    }
  }, [openVenueSheet, params.venueId, resetTourIdle, venues]);

  useEffect(() => {
    if (!sheetVenueId) return;
    if (!filteredVenues.some((v) => v.id === sheetVenueId)) {
      closeMapVenueSheet();
    }
  }, [closeMapVenueSheet, filteredVenues, sheetVenueId]);

  useEffect(() => {
    setCheckpointIndex(0);
  }, [activeCategory]);

  useEffect(() => {
    applyDistrictFlowFromPresence(districtFlowStateRef.current, {
      presence: districtFlowPresenceRows,
      venues: districtFlowVenues,
      meId: user?.id ?? null,
      friendIds: [...friendIdSet],
      ghostByUserId,
      myGhostMode: !!myProfile?.ghost_mode,
      nowMs: Date.now(),
    });
  }, [
    districtFlowPresenceRows,
    districtFlowVenues,
    user?.id,
    friendIdSet,
    ghostByUserId,
    myProfile?.ghost_mode,
    presenceClock,
  ]);

  const sheetOpenRef = useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;

  useEffect(() => {
    const id = setInterval(() => {
      if (sheetOpenRef.current) return;
      decayDistrictFlowState(districtFlowStateRef.current, Date.now());
      setDistrictFlowTick((n) => n + 1);
    }, 230);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!arrivalPulseVenueId) return;
    const msLeft = arrivalPulseUntil - Date.now();
    if (msLeft <= 0) return;
    const pulseId = setInterval(() => setArrivalPulseTick((n) => n + 1), 160);
    const stop = setTimeout(() => clearInterval(pulseId), msLeft + 120);
    return () => {
      clearInterval(pulseId);
      clearTimeout(stop);
    };
  }, [arrivalPulseVenueId, arrivalPulseUntil]);

  const activeCheckpointMeta = activeCheckpoint
    ? sortedCheckpoints.find((c) => c.venue.id === activeCheckpoint.id)
    : null;

  useEffect(() => {
    if (!checkpointMotionEnabled) return;
    if (!activeCheckpoint || !activeCheckpointMeta) return;
    const z = mapCanvasRef.current?.getCameraZoom() ?? 14;
    mapCanvasRef.current?.applyCameraMove({
      kind: "checkpoint",
      lat: activeCheckpoint.lat as number,
      lng: activeCheckpoint.lng as number,
      activity: activeCheckpointMeta.activity,
      distanceFromYou: activeCheckpointMeta.distanceFromYou,
      currentZoom: z,
    });
    const now = Date.now();
    setArrivalPulseVenueId(activeCheckpoint.id);
    setArrivalPulseUntil(now + CHECKPOINT_ARRIVAL_PULSE_MS);
    setCheckpointMotionEnabled(false);
  }, [activeCheckpoint?.id, activeCheckpointMeta, checkpointMotionEnabled]);

  useEffect(() => {
    if (!hasInitialMapCenter) return;
    if (!autoTourEnabled) return;
    if (checkpoints.length < 2) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== "active") return;
      const now = Date.now();
      if (now < autoTourPausedUntilRef.current) return;
      const progUntil = mapCanvasRef.current?.programmaticCameraUntilMs() ?? 0;
      if (now < progUntil) return;
      if (now - tourIdleSinceRef.current < AUTO_TOUR_IDLE_GRACE_MS) return;
      if (
        lastArrowPressAtRef.current > 0 &&
        now - lastArrowPressAtRef.current < AUTO_TOUR_ARROW_GRACE_MS
      ) {
        return;
      }
      if (lastAutoTourHopAtRef.current && now - lastAutoTourHopAtRef.current < AUTO_TOUR_REPEAT_MS) {
        return;
      }
      setCheckpointMotionEnabled(true);
      setCheckpointIndex((prev) => (prev + 1) % checkpoints.length);
      lastAutoTourHopAtRef.current = now;
    }, 1000);
    return () => clearInterval(timer);
  }, [autoTourEnabled, hasInitialMapCenter, checkpoints.length]);

  /** PWA: if GPS is slow/denied, still allow auto-tour after map is ready (~5s). */
  useEffect(() => {
    if (!nativeMapReady) return;
    const id = setTimeout(() => setHasInitialMapCenter((v) => v || true), 5000);
    return () => clearTimeout(id);
  }, [nativeMapReady]);

  const applyLocateMove = useCallback((step: 0 | 1, lat: number, lng: number) => {
    const z = mapCanvasRef.current?.getCameraZoom() ?? 14;
    mapCanvasRef.current?.applyCameraMove(
      step === 0
        ? { kind: "locate-step0", lat, lng, currentZoom: z }
        : { kind: "locate-step1", lat, lng }
    );
  }, []);

  const refreshLocationInBackground = useCallback(() => {
    if (locateRefreshInFlightRef.current) return;
    locateRefreshInFlightRef.current = true;
    void refreshLocation({ balanced: true }).finally(() => {
      locateRefreshInFlightRef.current = false;
    });
  }, [refreshLocation]);

  useEffect(() => {
    if (!nativeMapReady || !mapBootCenter || didAutoCenterYouRef.current) return;
    didAutoCenterYouRef.current = true;
    tourIdleSinceRef.current = Date.now();
    setHasInitialMapCenter(true);
  }, [mapBootCenter, nativeMapReady]);

  const goPrevCheckpoint = useCallback(() => {
    if (!checkpoints.length) return;
    const now = Date.now();
    lastArrowPressAtRef.current = now;
    tourIdleSinceRef.current = now;
    lastAutoTourHopAtRef.current = 0;
    autoTourPausedUntilRef.current = now;
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((i) => (i - 1 + checkpoints.length) % checkpoints.length);
  }, [checkpoints.length]);

  const goNextCheckpoint = useCallback(() => {
    if (!checkpoints.length) return;
    const now = Date.now();
    lastArrowPressAtRef.current = now;
    tourIdleSinceRef.current = now;
    lastAutoTourHopAtRef.current = 0;
    autoTourPausedUntilRef.current = now;
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((i) => (i + 1) % checkpoints.length);
  }, [checkpoints.length]);

  const onLocate = useCallback(() => {
    resetTourIdle();
    const target = resolveMapLocateTarget({
      selectedVenue,
      you: youCoords,
      meId: user?.id,
      presence,
      venues,
    });
    if (!target) {
      refreshLocationInBackground();
      return;
    }
    const currentZoom = mapCanvasRef.current?.getCameraZoom() ?? 14;
    const step = resolveLocateCycleStep(locateCycleStepRef.current, currentZoom);
    applyLocateMove(step, target.lat, target.lng);
    locateCycleStepRef.current = step === 0 ? 1 : 0;
    refreshLocationInBackground();
  }, [applyLocateMove, presence, refreshLocationInBackground, selectedVenue, user?.id, venues, youCoords]);

  const onOpenCheckpointVenue = useCallback(() => {
    if (!activeCheckpoint) return;
    resetTourIdle();
    openVenueSheet(activeCheckpoint);
    const idx = checkpoints.findIndex((v) => v.id === activeCheckpoint.id);
    if (idx >= 0) setCheckpointIndex(idx);
  }, [activeCheckpoint, checkpoints, openVenueSheet, resetTourIdle]);

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        {nativeMapReady && mapboxToken ? (
          <VenuesMapCanvas
            ref={mapCanvasRef}
            accessToken={mapboxToken}
            bootCenter={mapBootCenter}
            showOverlays={mapSettled}
            onMapStyleLoaded={onMapStyleLoaded}
            venues={geoVenues}
            selectedVenueId={selectedVenue?.id ?? null}
            highlightVenueId={selectedVenue?.id ?? activeCheckpoint?.id ?? null}
            freezeDeclarativeCamera
            onSelectVenue={(v) => {
              openVenueSheet(v);
              const idx = checkpoints.findIndex((c) => c.id === v.id);
              if (idx >= 0) setCheckpointIndex(idx);
            }}
            districtFlowGeoJson={districtFlowGeoJson}
            onMapUserPan={resetTourIdle}
            youCoords={locationPermission === "granted" ? youCoords : null}
            localYouMarker={localYouMarker}
            friendMarkers={friendMarkers}
            venueClusters={venueClusters}
            onPressPresenceMarker={onPressPresenceMarker}
            venueActivityGeoJson={venueActivityGeoJson}
          />
        ) : null}
        {!nativeMapReady || !mapboxToken ? (
          <View style={styles.fallbackMap}>
            <View style={styles.fallbackGrid} />
            {!nativeMapReady || !mapboxToken ? (
              <View style={styles.fallbackBanner}>
                <Text style={styles.fallbackBannerText}>
                  Full map requires a dev build and Mapbox token. Pins and sheets still work in preview mode.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <MapAtmosphereOverlay />
      </View>

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.topOverlay, { paddingTop: topOverlayPaddingTop }]} pointerEvents="box-none">
        <View
          style={[
            styles.overlayColumn,
            { width: OVERLAY_W, minHeight: MAP_TOP_OVERLAY_COLUMN_MIN_HEIGHT },
          ]}
        >
          <MapCategoryFilterTray
            active={activeCategory}
            onChange={(cat) => {
              resetTourIdle();
              setActiveCategory(cat);
            }}
            width={OVERLAY_W}
          />
          <MapSecondaryControls
            width={OVERLAY_W}
            friends={friendRows}
            onLocate={onLocate}
            onFocusFriend={focusFriendOnMap}
            onMapInteraction={resetTourIdle}
            onGhostChanged={() => void refreshMyProfile()}
            ghostCoords={
              youCoords && locationPermission === "granted"
                ? { lat: youCoords.lat, lng: youCoords.lng }
                : null
            }
            ghostVenues={venues}
          />
        </View>
        <View style={styles.venuesErrorSlot} pointerEvents="none">
          {venuesError ? (
            <Text style={styles.venuesError}>
              Couldn&apos;t load venues. Pull to refresh from Hub or try again.
            </Text>
          ) : null}
        </View>
      </View>

      {!sheetOpen &&
      myVenue.isAtVenue &&
      myVenue.venue &&
      activeCheckpoint?.id === myVenue.venue.id ? (
        <View style={[styles.atVenueWrap, { bottom: atVenuePillBottom }]} pointerEvents="box-none">
          <AtVenueIndicator
            venueName={myVenue.venue.name}
            live={myVenue.isLiveHere}
            settling={myVenue.isSettlingHere}
            onPress={onOpenCheckpointVenue}
          />
        </View>
      ) : null}

      <View style={[styles.checkpointWrap, { bottom: checkpointBarBottom }]} pointerEvents="box-none">
        <MapCheckpointBar
          width={CHECKPOINT_W}
          venue={activeCheckpoint}
          activity={activeCheckpointActivity}
          distanceFromYouM={activeCheckpointMeta?.distanceFromYou}
          hasYouCoords={locationPermission === "granted" && !!youCoords}
          onPrev={goPrevCheckpoint}
          onNext={goNextCheckpoint}
          onOpenVenue={onOpenCheckpointVenue}
        />
      </View>
      </View>

      <MapIntroCoach visible={mapIntroVisible} onDismiss={dismissMapIntro} />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  fallbackMap: {
    flex: 1,
    backgroundColor: "#0b1017",
  },
  fallbackGrid: {
    flex: 1,
    opacity: 0.35,
    backgroundColor: "#0f141d",
  },
  fallbackBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "38%",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(12, 13, 18, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  fallbackBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
  },
  venuesErrorSlot: {
    width: OVERLAY_W,
    minHeight: 18,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  venuesError: {
    fontSize: 11,
    color: "#fca5a5",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  topOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 12,
  },
  overlayColumn: {
    gap: 8,
    alignSelf: "center",
  },
  checkpointWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 12,
  },
  atVenueWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 13,
    paddingHorizontal: 16,
  },
});
