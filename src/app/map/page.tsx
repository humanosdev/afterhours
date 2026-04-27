"use client";

import mapboxgl from "mapbox-gl";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createNotification,
  getMyFriendIds,
  getNotificationPreferences,
} from "@/lib/notifications";
// Dev venue radii — off by default for MVP (enable locally when debugging zones)
const SHOW_DEV_RADII = false;

/* ================= TYPES ================= */

type Venue = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  visibility: "public" | "school_only";
  inner_radius_m: number;
  outer_radius_m: number;
  halo_radius_m: number;
};

type PresenceRow = {
  user_id: string;
  lng: number;
  lat: number;
  updated_at: string;
  venue_id: string | null;
  venue_state: "outside" | "inner_pending" | "inner_confirmed" | null;
  zone_type: "inner" | "outer" | "halo" | null;
};

type FriendProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  ghost_mode?: boolean | null;
};

type VenueCheckpoint = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  activity: number;
  distanceFromYou: number;
};

/* ================= UTILS ================= */

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) 
{
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function countUsersInVenue(
  venue: Venue,
  presence: PresenceRow[],
  friendsById: Record<string, true>
) {
  let total = 0;
  let friends = 0;

  for (const p of presence) {
    const last = new Date(p.updated_at).getTime();
const stale = Date.now() - last > 5 * 60_000; // 5 min like you wanted
    const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);

    if (d <= venue.outer_radius_m) {
      total++;
      if (friendsById[p.user_id]) friends++;
    }
  }

  return { total, friends };
}
function safeSetMapCursor(m: mapboxgl.Map | null, cursor: string) {
  const canvas = m?.getCanvas?.();
  if (canvas) canvas.style.cursor = cursor;
}

function createNeonPinImage() {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const circleCy = 34;
  const circleR = 18;
  const tipY = 74;

  // Soft purple bloom.
  const glow = ctx.createRadialGradient(cx, circleCy, 6, cx, circleCy, 36);
  glow.addColorStop(0, "rgba(139, 92, 246, 0.95)");
  glow.addColorStop(0.4, "rgba(139, 92, 246, 0.65)");
  glow.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, circleCy, 36, 0, Math.PI * 2);
  ctx.fill();

  // Pin silhouette.
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.bezierCurveTo(cx - 20, 54, cx - 18, 26, cx, 20);
  ctx.bezierCurveTo(cx + 18, 26, cx + 20, 54, cx, tipY);
  ctx.closePath();
  ctx.fillStyle = "#8b5cf6";
  ctx.fill();

  // Pin outline glow.
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2.2;
  ctx.shadowColor = "rgba(139,92,246,0.85)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner cutout.
  ctx.beginPath();
  ctx.arc(cx, circleCy, circleR * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

// dev 
function addRadiusLayer(
  map: mapboxgl.Map,
  id: string,
  center: [number, number],
  radiusMeters: number,
  color: string,
  opacity: number
) {
  // source
  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: center },
      },
    });
  } else {
    const src = map.getSource(id) as mapboxgl.GeoJSONSource;
    src.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: center },
    } as any);
  }

  // layer
  if (!map.getLayer(id)) {
    map.addLayer({
      id,
      type: "circle",
      source: id,
      paint: {
        "circle-radius": {
          stops: [
            [0, 0],
            [20, radiusMeters / 0.075],
          ],
          base: 2,
        },
        "circle-color": color,
        "circle-opacity": opacity,
        "circle-stroke-color": color,
        "circle-stroke-width": 1,
      },
    });
  }
}

/* ================= COMPONENT ================= */

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mapRef = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const hasRunInitialPresence = useRef(false);
  const hasCenteredToUser = useRef(false);

type VenuePerson = {
  user_id: string;
  isFriend: boolean;
  name: string;
};

const ONLINE_WINDOW_MS = 5 * 60_000;
const RECENT_VENUE_WINDOW_MS = 120 * 60_000;


  const youMarker = useRef<mapboxgl.Marker | null>(null);
  const presenceMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const venueClusterMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const [you, setYou] = useState<{ lng: number; lat: number } | null>(null);
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [myGhostMode, setMyGhostMode] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [friendsById, setFriendsById] = useState<Record<string, true>>({});
  useEffect(() => {
  const handler = (e: any) => {
    const removedId = e.detail.userId;

    setFriendsById((prev) => {
      const copy = { ...prev };
      delete copy[removedId];
      return copy;
    });
  };

  window.addEventListener("friend-removed", handler);
  return () => window.removeEventListener("friend-removed", handler);
}, []);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [usernamesById, setUsernamesById] = useState<Record<string, string>>({});
  const [friendProfilesById, setFriendProfilesById] = useState<Record<string, FriendProfile>>({});
  const presenceInterval = useRef<NodeJS.Timeout | null>(null);
const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
const [checkpointIndex, setCheckpointIndex] = useState(0);
const [autoTourPausedUntil, setAutoTourPausedUntil] = useState(0);
const [lastArrowPressAt, setLastArrowPressAt] = useState(0);
const [lastPageInteractionAt, setLastPageInteractionAt] = useState(() => Date.now());
const [autoVenueTourEnabled, setAutoVenueTourEnabled] = useState(true);
const [mapSidebarVisible, setMapSidebarVisible] = useState(true);
const [hasInitialMapCenter, setHasInitialMapCenter] = useState(false);
const [checkpointMotionEnabled, setCheckpointMotionEnabled] = useState(false);
const [arrivalPulseVenueId, setArrivalPulseVenueId] = useState<string | null>(null);
const [arrivalPulseUntil, setArrivalPulseUntil] = useState(0);
const [pulseTick, setPulseTick] = useState(0);
const [myProfile, setMyProfile] = useState<FriendProfile | null>(null);
const handledQueryVenueIdRef = useRef<string | null>(null);
const MAP_NAV_CLEARANCE_PX = 104;

const selectedVenue = selectedVenueId
  ? venues.find((v) => v.id === selectedVenueId) ?? null
  : null;
const queryVenueId = searchParams.get("venueId");

function closeVenueCard() {
  setSelectedVenueId(null);
}

const STALE_MS = 10 * 60_000;

function initialsFromName(name: string | null | undefined) {
  const clean = (name ?? "").trim();
  if (!clean) return "AH";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getVenuePeople(venueId: string) {
  const now = Date.now();
  const venue = venues.find((v) => v.id === venueId);

  if (!venue) {
    return {
      insideAll: [],
      nearbyAll: [],
      insideFriends: [],
      nearbyFriends: [],
      insideFriendsRecent: 0,
      nearbyFriendsRecent: 0,
    };
  }

  const insideAll: VenuePerson[] = [];
  const nearbyAll: VenuePerson[] = [];
  const insideFriends: VenuePerson[] = [];
  const nearbyFriends: VenuePerson[] = [];
  let insideFriendsRecent = 0;
  let nearbyFriendsRecent = 0;

  for (const p of presence) {
    if (hiddenIds.has(p.user_id)) continue;
  if (p.user_id === meId) continue;
  const lastSeenMs = new Date(p.updated_at).getTime();
  const isOnlineNow = now - lastSeenMs <= ONLINE_WINDOW_MS;
  const isRecentlySeen = now - lastSeenMs <= RECENT_VENUE_WINDOW_MS;

  const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);
  const isFriend = p.user_id in friendsById;

  // ✅ FILTER LOGIC (THIS IS THE FIX)
  if (!isFriend && d > venue.outer_radius_m) continue;
  

    const item = {
      user_id: p.user_id,
      isFriend,
      name: isFriend ? usernamesById[p.user_id] ?? "Friend" : "Someone",
      
    };

    if (d <= venue.inner_radius_m) {
      insideAll.push(item);
      if (isFriend) {
        insideFriends.push(item);
        if (!isOnlineNow && isRecentlySeen) insideFriendsRecent++;
      }
    } else if (d <= venue.outer_radius_m) {
      nearbyAll.push(item);
      if (isFriend) {
        nearbyFriends.push(item);
        if (!isOnlineNow && isRecentlySeen) nearbyFriendsRecent++;
      }
    }
  }

  return {
    insideAll,
    nearbyAll,
    insideFriends,
    nearbyFriends,
    insideFriendsRecent,
    nearbyFriendsRecent,
  };
}

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }

      setMeId(data.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("access_level, ghost_mode, username, display_name, avatar_url")
        .eq("id", data.user.id)
        .single();

      setAccessLevel(profile?.access_level ?? "public");
      setMyGhostMode(!!profile?.ghost_mode);
      setMyProfile({
        id: data.user.id,
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        ghost_mode: !!profile?.ghost_mode,
      });
    });
  }, [router]);

  /* ---------------- FRIENDS ---------------- */

  async function loadFriends(meId: string) {
  const { data } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`);

  if (!data) return;

  const map: Record<string, true> = {};
  const ids: string[] = [];

  for (const r of data) {
    const id = r.requester_id === meId ? r.addressee_id : r.requester_id;
    map[id] = true;
    ids.push(id);
  }

  setFriendsById(map);

  if (!ids.length) {
    setUsernamesById({});
    setFriendProfilesById({});
    return;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, ghost_mode")
    .in("id", ids);

  if (!profiles) return;

  const names: Record<string, string> = {};
  const profileMap: Record<string, FriendProfile> = {};
  for (const p of profiles) {
    if (p.username) names[p.id] = p.username;
    profileMap[p.id] = {
      id: p.id,
      username: p.username ?? null,
      display_name: p.display_name ?? null,
      avatar_url: p.avatar_url ?? null,
      ghost_mode: !!p.ghost_mode,
    };
  }

  setUsernamesById(names);
  setFriendProfilesById(profileMap);
}

useEffect(() => {
  if (!meId) return;
  loadFriends(meId);
}, [meId]);

useEffect(() => {
  const handler = () => {
    if (meId) loadFriends(meId);
  };

  window.addEventListener("friends-updated", handler);
  return () => window.removeEventListener("friends-updated", handler);
}, [meId]);

useEffect(() => {
  if (!meId || !you) return;

  const pingPresence = async () => {
    await supabase.from("user_presence").upsert(
      {
        user_id: meId,
        lng: you.lng,
        lat: you.lat,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  };

  pingPresence();
  const timer = setInterval(pingPresence, 30000);
  return () => clearInterval(timer);
}, [meId, you]);
  /* ---------------- BLOCKS ---------------- */
useEffect(() => {
  if (!meId) return;

  (async () => {
    const { data } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id");

    if (!data) return;

    const hidden = new Set<string>();

    for (const b of data) {
      if (b.blocker_id === meId) hidden.add(b.blocked_id);
      if (b.blocked_id === meId) hidden.add(b.blocker_id);
    }

    setHiddenIds(hidden);
  })();
}, [meId]);
//

function formatLastSeen(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);

  if (min < 2) return "online";
  if (min < 60) return `${min}m ago`;

  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

  /* ---------------- GEO ---------------- */

  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setYou({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        }),
      () => setYou({ lng: -75.1636, lat: 39.9526 }),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

 

  /* ---------------- MAP INIT ---------------- */

useEffect(() => {
  if (!mapRef.current || map.current) return;

  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const m = new mapboxgl.Map({
    container: mapRef.current,
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-75.1636, 39.9526], // stable default
    zoom: 14,
  });

  map.current = m;

  m.on("load", () => setMapReady(true));

  return () => {
    m.remove();
    map.current = null;
  };
}, []);

/* ---------------- FOLLOW USER ---------------- */

useEffect(() => {
  if (!map.current || !you) return;
  if (hasCenteredToUser.current) return;
  hasCenteredToUser.current = true;

  map.current.easeTo({
    center: [you.lng, you.lat],
    duration: 800,
  });
  setHasInitialMapCenter(true);
}, [you]);

/* ---------------- VISIBILITY FIX ---------------- */

useEffect(() => {
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      map.current?.resize();
    }
  };

  document.addEventListener("visibilitychange", onVisible);
  return () =>
    document.removeEventListener("visibilitychange", onVisible);
}, []);


  /* ---------------- LOAD VENUES ---------------- */

useEffect(() => {
  if (!accessLevel) return;

  (async () => {
    const q = supabase
      .from("venues")
      .select("*");

    // Visibility rules
    if (accessLevel === "public") {
      q.eq("visibility", "public");
    }

    const { data, error } = await q;

    if (error) {
      console.error("Venue load error:", error);
      return;
    }

    setVenues(data as Venue[]);
  })();
}, [accessLevel]);

function getCountsForVenue(
  venueId: string,
  presence: PresenceRow[],
  friendsById: Record<string, true>,
  venues: Venue[],
  meId: string | null
) {
  const now = Date.now();
  const venue = venues.find((v) => v.id === venueId);

  if (!venue) {
    return { redTotal: 0, redFriends: 0, greenTotal: 0, greenFriends: 0 };
  }

  let redTotal = 0;
  let redFriends = 0;
  let greenTotal = 0;
  let greenFriends = 0;

  for (const p of presence) {
    if (hiddenIds.has(p.user_id)) continue;
  if (p.user_id === meId) continue;

  const isFriend =
  !!friendsById[p.user_id] &&
  Object.keys(friendsById).includes(p.user_id);
  const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);

  // ✅ FILTER LOGIC (THIS IS THE FIX)
  const nearVenue = d <= venue.outer_radius_m;
  if (!isFriend && !nearVenue) continue;
    
    if (d <= venue.inner_radius_m) {
      redTotal++;
      if (isFriend) redFriends++;
    } else if (d <= venue.outer_radius_m) {
      greenTotal++;
      if (isFriend) greenFriends++;
    }
  }

  return { redTotal, redFriends, greenTotal, greenFriends };
}

const checkpoints = useMemo<VenueCheckpoint[]>(() => {
  return venues
    .map((v) => {
      const { redTotal, greenTotal } = getCountsForVenue(v.id, presence, friendsById, venues, meId);
      const activity = (redTotal ?? 0) + (greenTotal ?? 0);
      const distanceFromYou = you ? distanceMeters(you.lat, you.lng, v.lat, v.lng) : Number.MAX_SAFE_INTEGER;
      return {
        id: v.id,
        name: v.name,
        lng: v.lng,
        lat: v.lat,
        activity,
        distanceFromYou,
      };
    })
    .sort((a, b) => {
      if (b.activity !== a.activity) return b.activity - a.activity;
      return a.distanceFromYou - b.distanceFromYou;
    });
}, [venues, presence, friendsById, meId, you]);

const selectedVenuePeople = useMemo(() => {
  if (!selectedVenue) {
    return {
      insideAll: [] as VenuePerson[],
      nearbyAll: [] as VenuePerson[],
      insideFriends: [] as VenuePerson[],
      nearbyFriends: [] as VenuePerson[],
      insideFriendsRecent: 0,
      nearbyFriendsRecent: 0,
    };
  }
  return getVenuePeople(selectedVenue.id);
}, [selectedVenue, presence, hiddenIds, meId, friendsById, usernamesById, venues]);

const activeCheckpoint = checkpoints.length
  ? checkpoints[((checkpointIndex % checkpoints.length) + checkpoints.length) % checkpoints.length]
  : null;

useEffect(() => {
  if (!checkpoints.length) {
    setCheckpointIndex(0);
    return;
  }
  setCheckpointIndex((prev) => {
    const normalized = ((prev % checkpoints.length) + checkpoints.length) % checkpoints.length;
    return normalized;
  });
}, [checkpoints.length]);

useEffect(() => {
  if (!checkpointMotionEnabled) return;
  if (!activeCheckpoint || !map.current) return;
  const m = map.current;
  const currentZoom = m.getZoom();
  const dynamicZoom =
    16.2 +
    Math.min(0.6, Math.max(0, activeCheckpoint.activity / 24)) -
    Math.min(0.3, Math.max(0, activeCheckpoint.distanceFromYou / 2500) * 0.08);

  m.easeTo({
    center: [activeCheckpoint.lng, activeCheckpoint.lat],
    zoom: Math.max(15.8, Math.min(16.9, (currentZoom * 0.45) + (dynamicZoom * 0.55))),
    pitch: 52,
    duration: 1000,
    easing: (t) => t * (2 - t),
  });

  setArrivalPulseVenueId(activeCheckpoint.id);
  setArrivalPulseUntil(Date.now() + 1600);
  setCheckpointMotionEnabled(false);
}, [activeCheckpoint?.id, checkpointMotionEnabled]);

useEffect(() => {
  if (!map.current) return;
  const pause = () => {
    const now = Date.now();
    setLastPageInteractionAt(now);
    setAutoTourPausedUntil(now + 15000);
  };
  const m = map.current;
  m.on("dragstart", pause);
  m.on("zoomstart", pause);
  m.on("rotatestart", pause);
  m.on("pitchstart", pause);
  m.on("touchstart", pause);
  m.on("mousedown", pause);

  return () => {
    m.off("dragstart", pause);
    m.off("zoomstart", pause);
    m.off("rotatestart", pause);
    m.off("pitchstart", pause);
    m.off("touchstart", pause);
    m.off("mousedown", pause);
  };
}, [mapReady]);

useEffect(() => {
  if (!autoVenueTourEnabled) return;
  if (!hasInitialMapCenter) return;
  if (checkpoints.length < 2) return;
  const timer = setInterval(() => {
    if (Date.now() < autoTourPausedUntil) return;
    if (Date.now() - lastPageInteractionAt < 15000) return;
    if (Date.now() - lastArrowPressAt < 7000) return;
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((prev) => (prev + 1) % checkpoints.length);
  }, 6000);
  return () => clearInterval(timer);
}, [autoVenueTourEnabled, hasInitialMapCenter, checkpoints.length, autoTourPausedUntil, lastPageInteractionAt, lastArrowPressAt]);

useEffect(() => {
  if (!arrivalPulseVenueId) return;
  if (Date.now() > arrivalPulseUntil) return;
  const timer = setInterval(() => setPulseTick((v) => v + 1), 120);
  return () => clearInterval(timer);
}, [arrivalPulseVenueId, arrivalPulseUntil]);

useEffect(() => {
  if (typeof window === "undefined") return;
  const readSetting = () => {
    const stored = window.localStorage.getItem("map_auto_venue_tour_enabled");
    if (stored === null) {
      window.localStorage.setItem("map_auto_venue_tour_enabled", "true");
      setAutoVenueTourEnabled(true);
      return;
    }
    setAutoVenueTourEnabled(stored !== "false");
  };
  readSetting();
  const onChange = () => readSetting();
  window.addEventListener("map-auto-tour-setting-changed", onChange);
  return () => window.removeEventListener("map-auto-tour-setting-changed", onChange);
}, []);

useEffect(() => {
  const m = map.current;
  if (!m || !mapReady) return;
  if (!queryVenueId) return;
  if (!venues.length) return;
  if (handledQueryVenueIdRef.current === queryVenueId) return;

  const target = venues.find((v) => v.id === queryVenueId);
  if (!target) return;

  handledQueryVenueIdRef.current = queryVenueId;
  setSelectedVenueId(target.id);
  const now = Date.now();
  setLastPageInteractionAt(now);
  setAutoTourPausedUntil(now + 15000);
  m.easeTo({
    center: [target.lng, target.lat],
    zoom: Math.max(m.getZoom(), 15.8),
    duration: 950,
  });
}, [queryVenueId, venues, mapReady]);

  const venuesTapRef = useRef<Venue[]>([]);
  venuesTapRef.current = venues;

  const VENUE_ACTIVITY_SOURCE = "venues-activity-source";
  const VENUE_HEAT_LAYER = "venue-heat";
  const VENUE_GLOW_LAYER = "venue-glow";
  const VENUE_CORE_LAYER = "venue-core";
  const VENUE_ANCHOR_LAYER = "venues-anchor";
  const VENUE_NAME_LABEL_LAYER = "venues-name-labels";

  /* ---------------- VENUE HEAT FLOORS: one-time layers + listeners ---------------- */
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const legacyLayerIds = [
      "venues-cluster-count",
      "venues-cluster-circles",
      "venues-unclustered-dots",
      "venues-unclustered-labels",
      "presence-heat-layer",
      VENUE_HEAT_LAYER,
      VENUE_GLOW_LAYER,
      VENUE_CORE_LAYER,
      VENUE_ANCHOR_LAYER,
      VENUE_NAME_LABEL_LAYER,
    ];
    const legacySourceIds = [
      "venues-cluster-source",
      "presence-heat-source",
      VENUE_ACTIVITY_SOURCE,
    ];

    for (const lid of legacyLayerIds) {
      if (m.getLayer(lid)) m.removeLayer(lid);
    }
    for (const sid of legacySourceIds) {
      if (m.getSource(sid)) m.removeSource(sid);
    }

    const emptyFc = {
      type: "FeatureCollection" as const,
      features: [] as GeoJSON.Feature[],
    };

    m.addSource(VENUE_ACTIVITY_SOURCE, {
      type: "geojson",
      data: emptyFc as any,
    });

    if (!m.hasImage("venue-neon-pin")) {
      const neonPinImage = createNeonPinImage();
      if (neonPinImage) {
        m.addImage("venue-neon-pin", neonPinImage, { pixelRatio: 2 });
      }
    }

    // Blended venue heat field (continuous cloud-like energy).
    m.addLayer({
      id: VENUE_HEAT_LAYER,
      type: "heatmap",
      source: VENUE_ACTIVITY_SOURCE,
      paint: {
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "combined_count"], 0],
          0, 0,
          2, 0.2,
          6, 0.5,
          11, 0.8,
          18, 1.2,
        ],
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 0.6,
          14, 1.2,
          18, 2,
        ],
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 28,
          12, 40,
          14, 56,
          16, 72,
          18, 84,
        ],
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 0.5,
          12, 0.4,
          14, 0.28,
          15.5, 0.16,
          17, 0.06,
          18, 0,
        ],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.1, "#1D4ED8",
          0.3, "#22D3EE",
          0.5, "#A855F7",
          0.7, "#F97316",
          1, "#EF4444",
        ],
      },
    });

    // Venue energy glow (combined_count = inside_count + nearby_count).
    m.addLayer({
      id: VENUE_GLOW_LAYER,
      type: "circle",
      source: VENUE_ACTIVITY_SOURCE,
      paint: {
        "circle-color": [
          "step",
          ["coalesce", ["get", "combined_count"], 0],
          "#1D4ED8",
          3, "#22D3EE",
          7, "#A855F7",
          12, "#F97316",
          18, "#EF4444",
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          [
            "+",
            ["coalesce", ["get", "combined_count"], 0],
            ["*", 6, ["coalesce", ["get", "checkpoint_pulse"], 0]],
          ],
          0, 42,
          2, 58,
          6, 90,
          11, 130,
          17, 185,
          25, 240,
        ],
        "circle-blur": 0.9,
        "circle-opacity": [
          "case",
          ["==", ["coalesce", ["get", "checkpoint_active"], 0], 1],
          0.7,
          0.3,
        ],
        "circle-pitch-alignment": "map",
        "circle-stroke-width": 0,
      },
    });

    m.addLayer({
      id: VENUE_CORE_LAYER,
      type: "circle",
      source: VENUE_ACTIVITY_SOURCE,
      paint: {
        "circle-color": [
          "step",
          ["coalesce", ["get", "combined_count"], 0],
          "#1D4ED8",
          3, "#22D3EE",
          7, "#A855F7",
          12, "#F97316",
          18, "#EF4444",
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          [
            "+",
            ["coalesce", ["get", "combined_count"], 0],
            ["*", 3, ["coalesce", ["get", "checkpoint_pulse"], 0]],
          ],
          0, 10,
          2, 14,
          6, 20,
          11, 28,
          17, 36,
          25, 44,
        ],
        "circle-blur": 0.25,
        "circle-opacity": [
          "case",
          ["==", ["coalesce", ["get", "checkpoint_active"], 0], 1],
          0,
          0,
        ],
        "circle-pitch-alignment": "map",
      },
    });

    // Existing marker anchor stays above energy layers.
    m.addLayer({
      id: VENUE_ANCHOR_LAYER,
      type: "symbol",
      source: VENUE_ACTIVITY_SOURCE,
      layout: {
        "icon-image": "venue-neon-pin",
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 0.5,
          14, 0.62,
          18, 0.72,
        ],
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-opacity": [
          "case",
          ["==", ["coalesce", ["get", "checkpoint_active"], 0], 1],
          1,
          0.9,
        ],
      },
    });

    m.addLayer({
      id: VENUE_NAME_LABEL_LAYER,
      type: "symbol",
      source: VENUE_ACTIVITY_SOURCE,
      minzoom: 10.5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10.5, 12,
          14, 14,
          18, 16,
        ],
        "text-offset": [0, 1.55],
        "text-letter-spacing": 0.03,
        "text-anchor": "top",
        "text-max-width": 14,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": [
          "case",
          ["==", ["coalesce", ["get", "checkpoint_active"], 0], 1],
          "rgba(255,255,255,0.98)",
          "rgba(255,255,255,0.66)",
        ],
        "text-halo-color": "rgba(0,0,0,0.82)",
        "text-halo-width": 1.3,
      },
    });

    const venueClickLayers = [
      VENUE_ANCHOR_LAYER,
      VENUE_CORE_LAYER,
      VENUE_GLOW_LAYER,
      VENUE_HEAT_LAYER,
      VENUE_NAME_LABEL_LAYER,
    ];

    const handleVenueClick = (e: mapboxgl.MapMouseEvent) => {
      let feature = e.features?.[0];
      if (!feature) {
        const hits = m.queryRenderedFeatures(e.point, { layers: venueClickLayers });
        feature = hits[0];
      }
      if (!feature) return;

      const props = feature.properties ?? {};
      const venueId = (props.venueId ?? props.venue_id) as string | undefined;
      if (!venueId) return;

      const venue = venuesTapRef.current.find((v) => v.id === venueId);
      if (!venue) return;

      setSelectedVenueId(venue.id);
    };

    const onPointerEnter = () => safeSetMapCursor(m, "pointer");
    const onPointerLeave = () => safeSetMapCursor(m, "");

    m.on("click", VENUE_ANCHOR_LAYER, handleVenueClick);
    m.on("click", VENUE_CORE_LAYER, handleVenueClick);
    m.on("click", VENUE_GLOW_LAYER, handleVenueClick);
    m.on("click", VENUE_HEAT_LAYER, handleVenueClick);
    m.on("click", VENUE_NAME_LABEL_LAYER, handleVenueClick);

    for (const lid of venueClickLayers) {
      m.on("mouseenter", lid, onPointerEnter);
      m.on("mouseleave", lid, onPointerLeave);
    }

    return () => {
      try {
        m.off("click", VENUE_ANCHOR_LAYER, handleVenueClick);
        m.off("click", VENUE_CORE_LAYER, handleVenueClick);
        m.off("click", VENUE_GLOW_LAYER, handleVenueClick);
        m.off("click", VENUE_HEAT_LAYER, handleVenueClick);
        m.off("click", VENUE_NAME_LABEL_LAYER, handleVenueClick);
        for (const lid of venueClickLayers) {
          m.off("mouseenter", lid, onPointerEnter);
          m.off("mouseleave", lid, onPointerLeave);
        }
      } catch {
        /* map may already be destroyed */
      }
      safeSetMapCursor(m, "");
      try {
        if (m.getLayer(VENUE_NAME_LABEL_LAYER)) m.removeLayer(VENUE_NAME_LABEL_LAYER);
        if (m.getLayer(VENUE_ANCHOR_LAYER)) m.removeLayer(VENUE_ANCHOR_LAYER);
        if (m.getLayer(VENUE_CORE_LAYER)) m.removeLayer(VENUE_CORE_LAYER);
        if (m.getLayer(VENUE_GLOW_LAYER)) m.removeLayer(VENUE_GLOW_LAYER);
        if (m.getLayer(VENUE_HEAT_LAYER)) m.removeLayer(VENUE_HEAT_LAYER);
        if (m.getSource(VENUE_ACTIVITY_SOURCE)) m.removeSource(VENUE_ACTIVITY_SOURCE);
      } catch {
        /* map teardown */
      }
    };
  }, [mapReady]);

  /* ---------------- VENUE HEAT FLOORS: data only (no layer churn) ---------------- */
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const src = m.getSource(VENUE_ACTIVITY_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    const features = venues.map((v) => {
      const { redTotal, greenTotal } = getCountsForVenue(
        v.id,
        presence,
        friendsById,
        venues,
        meId
      );
      const inside = redTotal ?? 0;
      const nearby = greenTotal ?? 0;
      const combined = inside + nearby;
      const isActiveCheckpoint = activeCheckpoint?.id === v.id;
      const pulseProgress =
        arrivalPulseVenueId === v.id && Date.now() < arrivalPulseUntil
          ? Math.max(0, (arrivalPulseUntil - Date.now()) / 1600)
          : 0;

      return {
        type: "Feature" as const,
        properties: {
          venueId: v.id,
          name: v.name,
          inside_count: inside,
          nearby_count: nearby,
          combined_count: combined,
          checkpoint_active: isActiveCheckpoint ? 1 : 0,
          checkpoint_pulse: pulseProgress,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [v.lng, v.lat] as [number, number],
        },
      };
    });

    src.setData({
      type: "FeatureCollection",
      features,
    } as any);
  }, [
    venues,
    presence,
    friendsById,
    meId,
    mapReady,
    hiddenIds,
    activeCheckpoint?.id,
    arrivalPulseVenueId,
    arrivalPulseUntil,
    pulseTick,
  ]);

/* ---------------- DEV RADII ---------------- */

useEffect(() => {
  if (!SHOW_DEV_RADII) return;

  const m = map.current;
  if (!m || !mapReady) return;

  for (const v of venues) {
  

    addRadiusLayer(
      m,
      `outer-${v.id}`,
      [v.lng, v.lat],
      v.outer_radius_m,
      "#22c55e",
      0.1
    );

    addRadiusLayer(
      m,
      `inner-${v.id}`,
      [v.lng, v.lat],
      v.inner_radius_m,
      "#ef4444",
      0.15
    );
  }
}, [venues, mapReady]);


  /* ---------------- SAVE PRESENCE (STABLE) ---------------- */

  useEffect(() => {
  if (!you || !meId || venues.length === 0) return;
 // if (hasRunInitialPresence.current) return;


    const run = async () => {
      const { data: prev } = await supabase
  .from("user_presence")
  .select("venue_id, venue_state, entered_inner_at, updated_at")
  .eq("user_id", meId)
  .single();
const needsInitialAssignment = !prev?.venue_id;


      const prevState = prev?.venue_state ?? "outside";
      let nextVenueState = prevState;
      let enteredInnerAt = prev?.entered_inner_at ?? null;

      let venueId: string | null = null;
      let zoneType: "halo" | "outer" | "inner" | null = null;

     let bestInner = { id: null as string | null, d: Infinity };
let bestOuter = { id: null as string | null, d: Infinity };
let bestHalo = { id: null as string | null, d: Infinity };

for (const v of venues) {
  const d = distanceMeters(you.lat, you.lng, v.lat, v.lng);

  if (d <= v.inner_radius_m && d < bestInner.d) bestInner = { id: v.id, d };
  if (d <= v.outer_radius_m && d < bestOuter.d) bestOuter = { id: v.id, d };
  if (d <= v.halo_radius_m && d < bestHalo.d) bestHalo = { id: v.id, d };
}

if (bestInner.id) {
  venueId = bestInner.id;
  zoneType = "inner";
} else if (bestOuter.id) {
  venueId = bestOuter.id;
  zoneType = "outer";
} else if (bestHalo.id) {
  venueId = bestHalo.id;
  zoneType = "halo";
}


      if (
        zoneType === "inner" &&
        prevState !== "inner_pending" &&
        prevState !== "inner_confirmed"
      ) {
        nextVenueState = "inner_pending";
        enteredInnerAt = new Date().toISOString();
      }

      if (zoneType !== "inner" && prevState !== "outside") {
        nextVenueState = "outside";
        enteredInnerAt = null;
      }

      if (prevState === "inner_pending" && enteredInnerAt) {
        if (Date.now() - new Date(enteredInnerAt).getTime() >= 60_000) {
          nextVenueState = "inner_confirmed";
        }
      }

      await supabase.from("user_presence").upsert(
        {
          user_id: meId,
          lng: you.lng,
          lat: you.lat,
          venue_id: venueId,
          zone_type: zoneType,
          venue_state: nextVenueState,
          entered_inner_at: enteredInnerAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      // ---------------- Notifications (additive, no presence logic changes) ----------------
      const prevUpdatedAt = prev?.updated_at ? new Date(prev.updated_at).getTime() : 0;
      const wasRecentlyOnline = prevUpdatedAt
        ? Date.now() - prevUpdatedAt < 5 * 60_000
        : false;
      const nowRecentlyOnline = true; // this upsert marks active presence

      const friendIds = await getMyFriendIds(meId);
      if (friendIds.length > 0) {
        const prefs = await getNotificationPreferences(friendIds);

        // Notify friends when coming online (throttled in createNotification).
        if (!wasRecentlyOnline && nowRecentlyOnline) {
          for (const fid of friendIds) {
            const p = prefs.get(fid);
            if (p?.online === false) continue;
            await createNotification({
              recipientId: fid,
              actorId: meId,
              type: "friend_online",
            });
          }
        }

        // Notify friends when joining a venue (only if venue changed/new).
        const prevVenueId = prev?.venue_id ?? null;
        const joinedNewVenue =
          !!venueId && venueId !== prevVenueId && (zoneType === "inner" || zoneType === "outer");

        if (joinedNewVenue) {
          for (const fid of friendIds) {
            const p = prefs.get(fid);
            if (p?.venue === false) continue;
            await createNotification({
              recipientId: fid,
              actorId: meId,
              type: "friend_joined_venue",
              venueId,
            });
          }
        }
      }

      hasRunInitialPresence.current = true;

    };

    run();
  }, [you, meId, venues]);


  

  /* ---------------- LOAD PRESENCE (VISIBILITY-AWARE) ---------------- */

useEffect(() => {
  let mounted = true;

  const load = async () => {
   const { data } = await supabase
  .from("user_presence")
  .select("user_id, lng, lat, updated_at, venue_id, venue_state, zone_type");


    if (mounted) {
      setPresence((data ?? []) as PresenceRow[]);
    }
  };

  const startPolling = () => {
    if (presenceInterval.current) return;

    load(); // immediate fetch on resume
    presenceInterval.current = setInterval(load, 5000);
  };

  const stopPolling = () => {
    if (!presenceInterval.current) return;

    clearInterval(presenceInterval.current);
    presenceInterval.current = null;
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      startPolling();
    } else {
      stopPolling();
    }
  };

  // initial state
  if (document.visibilityState === "visible") {
    startPolling();
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    mounted = false;
    stopPolling();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}, []);


  /* ---------------- FRIEND PFP + VENUE CLUSTERS ---------------- */
  useEffect(() => {
    const m = map.current;
    presenceMarkers.current.forEach((marker) => marker.remove());
    presenceMarkers.current.clear();
    venueClusterMarkers.current.forEach((marker) => marker.remove());
    venueClusterMarkers.current.clear();
    if (!m || !mapReady) return;

    const now = Date.now();
    const activeThresholdMs = STALE_MS;
    const latestPresenceByUser = new Map<string, PresenceRow>();
    const activePresenceByUser = new Map<string, PresenceRow>();

    for (const p of presence) {
      const lastMs = new Date(p.updated_at).getTime();
      const prevLatest = latestPresenceByUser.get(p.user_id);
      if (!prevLatest || new Date(prevLatest.updated_at).getTime() < lastMs) {
        latestPresenceByUser.set(p.user_id, p);
      }
      if (now - lastMs > activeThresholdMs) continue;
      const prevActive = activePresenceByUser.get(p.user_id);
      if (!prevActive || new Date(prevActive.updated_at).getTime() < lastMs) {
        activePresenceByUser.set(p.user_id, p);
      }
    }

    const friendIds = Object.keys(friendsById);
    const candidateIds = Array.from(new Set([...(meId ? [meId] : []), ...friendIds]));

    const findContainingVenue = (p: PresenceRow): Venue | null => {
      let best: { venue: Venue; d: number } | null = null;
      for (const v of venues) {
        const d = distanceMeters(p.lat, p.lng, v.lat, v.lng);
        if (d <= v.outer_radius_m && (!best || d < best.d)) {
          best = { venue: v, d };
        }
      }
      return best?.venue ?? null;
    };

    const venueBuckets = new Map<
      string,
      { venue: Venue; allCount: number; visibleUserIds: string[] }
    >();
    const buildAvatarElement = (
      avatarUrl: string | null | undefined,
      label: string,
      sizePx: number,
      fallbackSizePx: number
    ) => {
      const avatar = document.createElement("div");
      avatar.style.width = `${sizePx}px`;
      avatar.style.height = `${sizePx}px`;
      avatar.style.borderRadius = "999px";
      avatar.style.overflow = "hidden";
      avatar.style.border = "1px solid rgba(255,255,255,0.8)";
      avatar.style.background = "rgba(15,23,42,0.95)";
      avatar.style.flexShrink = "0";

      const setFallback = () => {
        avatar.innerHTML = "";
        const txt = document.createElement("div");
        txt.style.width = "100%";
        txt.style.height = "100%";
        txt.style.display = "grid";
        txt.style.placeItems = "center";
        txt.style.fontSize = `${fallbackSizePx}px`;
        txt.style.fontWeight = "700";
        txt.style.color = "white";
        txt.textContent = initialsFromName(label);
        avatar.appendChild(txt);
      };

      if (avatarUrl) {
        const img = document.createElement("img");
        img.src = avatarUrl;
        img.alt = label;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.display = "block";
        img.onerror = () => setFallback();
        avatar.appendChild(img);
      } else {
        setFallback();
      }

      return avatar;
    };

    for (const id of candidateIds) {
      const latestP = latestPresenceByUser.get(id);
      if (!latestP) continue;
      if (hiddenIds.has(id)) continue;

      const isMe = id === meId;
      const isFriend = !!friendsById[id];
      if (!isMe && !isFriend) continue;

      const inVenue = findContainingVenue(latestP);
      const ghost = isMe
        ? myGhostMode
        : !!friendProfilesById[id]?.ghost_mode;

      if (inVenue) {
        const bucket = venueBuckets.get(inVenue.id) ?? {
          venue: inVenue,
          allCount: 0,
          visibleUserIds: [],
        };
        bucket.allCount += 1;
        if (!ghost) bucket.visibleUserIds.push(id);
        venueBuckets.set(inVenue.id, bucket);
        continue;
      }

      const p = activePresenceByUser.get(id);
      if (!p) continue;
      if (ghost) continue;

      const profile = isMe ? myProfile : friendProfilesById[id];
      const label =
        isMe
          ? "You"
          : profile?.display_name ||
            profile?.username ||
            usernamesById[id] ||
            "Friend";

      const markerEl = document.createElement("button");
      markerEl.type = "button";
      markerEl.style.width = "42px";
      markerEl.style.height = "42px";
      markerEl.style.borderRadius = "999px";
      markerEl.style.border = "0";
      markerEl.style.padding = "0";
      markerEl.style.background = "transparent";
      markerEl.style.overflow = "hidden";
      markerEl.style.boxShadow = isFriend || isMe
        ? "0 0 0 6px rgba(56,189,248,0.18), 0 0 18px rgba(56,189,248,0.35)"
        : "none";
      markerEl.style.cursor = "pointer";
      markerEl.setAttribute("aria-label", `Open ${label} profile`);

      markerEl.appendChild(
        buildAvatarElement(profile?.avatar_url, label, 42, 11)
      );

      markerEl.onclick = (ev) => {
        ev.stopPropagation();
        if (isMe) {
          router.push("/profile");
          return;
        }
        router.push(`/profile/${id}`);
      };

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([p.lng, p.lat])
        .addTo(m);
      presenceMarkers.current.set(id, marker);
    }

    for (const [venueId, bucket] of venueBuckets.entries()) {
      const visibleTop = bucket.visibleUserIds.slice(0, 3);
      if (!visibleTop.length) continue;

      const wrap = document.createElement("button");
      wrap.type = "button";
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "0";
      wrap.style.padding = "0";
      wrap.style.border = "0";
      wrap.style.background = "transparent";
      wrap.style.cursor = "pointer";

      const avatars = document.createElement("div");
      avatars.style.display = "flex";
      avatars.style.alignItems = "center";
      avatars.style.marginLeft = "16px";

      visibleTop.forEach((uid, index) => {
        const profile = uid === meId ? myProfile : friendProfilesById[uid];
        const name =
          uid === meId
            ? "You"
            : profile?.display_name ||
              profile?.username ||
              usernamesById[uid] ||
              "F";
        const avatar = buildAvatarElement(profile?.avatar_url, name, 24, 10);
        if (index > 0) avatar.style.marginLeft = "-7px";
        avatars.appendChild(avatar);
      });
      wrap.appendChild(avatars);

      wrap.onclick = (ev) => {
        ev.stopPropagation();
        setSelectedVenueId(bucket.venue.id);
      };

      const marker = new mapboxgl.Marker({ element: wrap, offset: [16, -26] })
        .setLngLat([bucket.venue.lng, bucket.venue.lat])
        .addTo(m);
      venueClusterMarkers.current.set(venueId, marker);
    }
  }, [
    presence,
    JSON.stringify(friendsById),
    friendProfilesById,
    usernamesById,
    meId,
    myGhostMode,
    myProfile,
    hiddenIds,
    router,
    mapReady,
    venues,
  ]);

  const rightSidebarFriends = useMemo(() => {
    const now = Date.now();
    const ids = Object.keys(friendsById);
    return ids
      .map((id) => {
        const profile = friendProfilesById[id];
        const pres = presence.find((p) => p.user_id === id);
        const lastSeen = pres?.updated_at ?? null;
        const online = !!lastSeen && now - new Date(lastSeen).getTime() < 5 * 60_000;
        return { id, profile, online, lastSeen };
      })
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        const ta = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const tb = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return tb - ta;
      });
  }, [friendsById, friendProfilesById, presence]);

  const goToPrevCheckpoint = () => {
    if (!checkpoints.length) return;
    const now = Date.now();
    setLastArrowPressAt(now);
    setLastPageInteractionAt(now);
    setAutoTourPausedUntil(now + 15000);
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((prev) => (prev - 1 + checkpoints.length) % checkpoints.length);
  };

  const goToNextCheckpoint = () => {
    if (!checkpoints.length) return;
    const now = Date.now();
    setLastArrowPressAt(now);
    setLastPageInteractionAt(now);
    setAutoTourPausedUntil(now + 15000);
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((prev) => (prev + 1) % checkpoints.length);
  };

    return (
    <div
      className="w-screen h-screen relative"
      onPointerDown={() => setLastPageInteractionAt(Date.now())}
    >
      <div ref={mapRef} className="w-full h-full" />
      <button
        type="button"
        onClick={async () => {
          if (!meId) return;
          const now = Date.now();
          setLastPageInteractionAt(now);
          setAutoTourPausedUntil(now + 15000);
          const next = !myGhostMode;
          setMyGhostMode(next);
          await supabase
            .from("profiles")
            .update({ ghost_mode: next })
            .eq("id", meId);
        }}
        className="absolute left-3 top-14 z-20 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur"
      >
        {myGhostMode ? "Ghost: On" : "Ghost: Off"}
      </button>
      <button
        type="button"
        onClick={() => setMapSidebarVisible((prev) => !prev)}
        className="absolute right-2 top-14 z-20 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur"
        aria-label={mapSidebarVisible ? "Hide friends sidebar" : "Show friends sidebar"}
      >
        {mapSidebarVisible ? "Friends →" : "← Friends"}
      </button>
      <aside
        className={`absolute right-2 top-24 z-20 w-[80px] overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-1.5 backdrop-blur transition-all duration-200 ${
          mapSidebarVisible ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0 pointer-events-none"
        }`}
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MAP_NAV_CLEARANCE_PX}px)`,
        }}
      >
        <div className="space-y-1.5">
          {rightSidebarFriends.map((f) => {
            const label =
              f.profile?.display_name ||
              f.profile?.username ||
              usernamesById[f.id] ||
              "Friend";
            return (
              <button
                key={f.id}
                onClick={() => router.push(`/profile/${f.id}`)}
                className="group relative flex w-full justify-center py-0.5"
                aria-label={`Open ${label} profile`}
              >
                <div className={`relative rounded-full ${f.online ? "shadow-[0_0_18px_rgba(34,197,94,0.45)]" : ""}`}>
                  {f.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.profile.avatar_url}
                      alt={label}
                      className="h-11 w-11 rounded-full border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold text-white">
                      {initialsFromName(label)}
                    </div>
                  )}
                  {f.online ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-400" />
                  ) : null}
                </div>
              </button>
            );
          })}
          {rightSidebarFriends.length === 0 ? (
            <div className="pt-1 text-center text-[11px] text-white/45">No crowd yet</div>
          ) : null}
        </div>
      </aside>
      {!selectedVenue ? (
      <div
        className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/60 px-2.5 py-1.5 backdrop-blur"
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MAP_NAV_CLEARANCE_PX}px)`,
        }}
      >
        <button
          type="button"
          onClick={goToPrevCheckpoint}
          className="grid h-8.5 w-8.5 place-items-center rounded-full border border-white/15 bg-white/5 text-sm text-white"
          aria-label="Previous checkpoint"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => {
            if (!activeCheckpoint) return;
            const now = Date.now();
            setLastPageInteractionAt(now);
            setAutoTourPausedUntil(now + 15000);
            setSelectedVenueId(activeCheckpoint.id);
          }}
          className="max-w-[210px] truncate px-2 text-center text-xs font-medium text-white/90"
          aria-label="Open active checkpoint"
        >
          {activeCheckpoint
            ? `${activeCheckpoint.name} • ${activeCheckpoint.activity}`
            : "No crowd yet"}
        </button>
        <button
          type="button"
          onClick={goToNextCheckpoint}
          className="grid h-8.5 w-8.5 place-items-center rounded-full border border-white/15 bg-white/5 text-sm text-white"
          aria-label="Next checkpoint"
        >
          →
        </button>
      </div>
      ) : null}
      {selectedVenue ? (
        <section
          className="absolute inset-x-0 z-30 h-[62svh] max-h-[620px] rounded-t-3xl border-t border-white/15 bg-black/90 text-white shadow-[0_-18px_48px_rgba(0,0,0,0.45)] backdrop-blur md:h-1/2 overflow-hidden"
          style={{
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MAP_NAV_CLEARANCE_PX - 10}px)`,
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-tight">📍 {selectedVenue.name}</p>
                {selectedVenue.category ? (
                  <p className="mt-0.5 text-xs text-white/60">{selectedVenue.category}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeVenueCard}
                className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/85"
                aria-label="Close venue panel"
              >
                ✕
              </button>
            </div>
            <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Venue Image
                </div>
                <div className="grid h-[160px] place-items-center rounded-xl border border-dashed border-white/20 bg-black/35 text-center">
                  <p className="text-sm font-medium text-white/80">Image coming soon</p>
                </div>
              </div>
              <div className="min-h-0 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-xs text-white/60">Inside</p>
                    <p className="font-semibold">{selectedVenuePeople.insideAll.length}</p>
                    <p className="text-[11px] text-white/50">
                      {selectedVenuePeople.insideFriends.length} friends • {selectedVenuePeople.insideFriendsRecent} recently
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-xs text-white/60">Nearby</p>
                    <p className="font-semibold">{selectedVenuePeople.nearbyAll.length}</p>
                    <p className="text-[11px] text-white/50">
                      {selectedVenuePeople.nearbyFriends.length} friends • {selectedVenuePeople.nearbyFriendsRecent} recently
                    </p>
                  </div>
                </div>
                <div
                  className="h-[calc(100%-86px)] space-y-3 overflow-y-auto overscroll-contain pr-1"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="border-b border-white/10 pb-3">
                    <h3 className="mb-1.5 text-xs font-semibold text-white/85">Friends Inside</h3>
                    {selectedVenuePeople.insideFriends.length ? (
                      <div className="space-y-1.5">
                        {selectedVenuePeople.insideFriends.map((friend) => (
                          <div
                            key={`${friend.user_id}-inside`}
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
                          >
                            <p className="truncate">{friend.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50">Be the first there</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold text-white/85">Friends Nearby</h3>
                    {selectedVenuePeople.nearbyFriends.length ? (
                      <div className="space-y-1.5">
                        {selectedVenuePeople.nearbyFriends.map((friend) => (
                          <div
                            key={`${friend.user_id}-nearby`}
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
                          >
                            <p className="truncate">{friend.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50">Quiet right now</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="grid h-screen w-screen place-items-center bg-primary text-text-secondary">
          Loading map...
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
