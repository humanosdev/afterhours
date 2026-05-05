"use client";

import mapboxgl from "mapbox-gl";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UtensilsCrossed,
  Sparkles,
  GraduationCap,
  Grid3X3,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LocateFixed,
} from "lucide-react";
import {
  createNotification,
  getMyFriendIds,
  getNotificationPreferences,
} from "@/lib/notifications";
import {
  LIVE_WINDOW_MS,
  getPresenceFreshness,
  isLikelyMapFallbackPresence,
  isPresenceLive,
  isValidCoordinatePair,
  MAP_FALLBACK_CENTER_LAT,
  MAP_FALLBACK_CENTER_LNG,
} from "@/lib/presence";
import { formatRelativeTime } from "@/lib/time";
import ProtectedRoute from "@/components/ProtectedRoute";
import MapPageSkeleton from "@/components/skeletons/MapPageSkeleton";
// Dev venue radii — off by default for MVP (enable locally when debugging zones)
const SHOW_DEV_RADII = false;

/** Locate overlay: hide after map has settled, but never shorter than this (avoids a flash). */
const LOCATE_WORMHOLE_MIN_MS = 320;
const LOCATE_WORMHOLE_MAX_MS = 4000;

/** Friend/me avatar pins: ease toward each new polled position (no extra API traffic). */
const PRESENCE_MARKER_SMOOTH_ALPHA = 0.18;
/** Snap instead of sliding when the jump is huge (teleport, fresh session). ~1.3km at mid-lat. */
const PRESENCE_MARKER_SNAP_DEG = 0.012;

const MAP_STYLE_DAY = "mapbox://styles/mapbox/light-v11";
const MAP_STYLE_NIGHT = "mapbox://styles/mapbox/dark-v11";
const MAP_BRAND_TINT_LAYER = "map-brand-tone-overlay";

/** Must match `venue-heat` layer `heatmap-intensity` (global pulse multiplies this expression). */
const HEATMAP_INTENSITY_BASE_EXPR: mapboxgl.Expression = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.6,
  14,
  1.2,
  18,
  2,
];

/** Local device clock: light map 7:00–17:59, night from 18:00 until before 7:00. */
function localHourIsMapDaytime(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 7 && h < 18;
}

function mapStyleUrlForDayMode(day: boolean): string {
  return day ? MAP_STYLE_DAY : MAP_STYLE_NIGHT;
}

function applyMapAtmosphereForMode(m: mapboxgl.Map, dayMode: boolean) {
  if (dayMode) {
    m.setFog({
      range: [1, 10],
      color: "#f6f4fa",
      "high-color": "#ece7f4",
      "horizon-blend": 0.26,
      "space-color": "#f7f5fb",
      "star-intensity": 0,
    });
  } else {
    m.setFog({
      range: [0.85, 8],
      color: "#09080d",
      "high-color": "#0e0b16",
      "horizon-blend": 0.1,
      "space-color": "#09080d",
      "star-intensity": 0.62,
    });
  }
}

function applyBrandedBasemapTheme(m: mapboxgl.Map, dayMode: boolean) {
  const roadColor = dayMode ? "#d8d2e6" : "#2a2038";
  const roadOutlineColor = dayMode ? "#c8c0d8" : "#3a2b50";
  const labelColor = dayMode ? "#3a3347" : "#d7d0e8";
  const mutedLabelColor = dayMode ? "#746b82" : "#8f82a8";
  const waterColor = dayMode ? "#e8e3f5" : "#151022";
  const parkColor = dayMode ? "#ece7f4" : "#181321";
  const landColor = dayMode ? "#f8f7fc" : "#0e0b16";
  const bgColor = dayMode ? "#f7f5fb" : "#09080d";

  const safeSetPaint = (layerId: string, paint: any, value: unknown) => {
    try {
      if (m.getLayer(layerId)) m.setPaintProperty(layerId, paint as any, value as any);
    } catch {
      /* layer/paint mismatch across style revisions */
    }
  };

  const style = m.getStyle();
  for (const layer of style.layers ?? []) {
    const id = layer.id.toLowerCase();
    const type = layer.type;

    if (type === "background") {
      safeSetPaint(layer.id, "background-color", bgColor);
      continue;
    }

    if (type === "fill") {
      if (id.includes("water")) {
        safeSetPaint(layer.id, "fill-color", waterColor);
      } else if (id.includes("park")) {
        safeSetPaint(layer.id, "fill-color", parkColor);
      } else if (id.includes("land") || id.includes("landuse")) {
        safeSetPaint(layer.id, "fill-color", landColor);
      }
      continue;
    }

    if (type === "line") {
      if (id.includes("road")) {
        safeSetPaint(layer.id, "line-color", roadColor);
      }
      if (id.includes("bridge") || id.includes("tunnel")) {
        safeSetPaint(layer.id, "line-color", roadOutlineColor);
      }
      continue;
    }

    if (type === "symbol" && id.includes("label")) {
      const color = id.includes("place") || id.includes("road") ? labelColor : mutedLabelColor;
      safeSetPaint(layer.id, "text-color", color);
      safeSetPaint(layer.id, "text-halo-color", dayMode ? "rgba(247,245,251,0.88)" : "rgba(9,8,13,0.88)");
      safeSetPaint(layer.id, "text-halo-width", dayMode ? 0.8 : 0.7);
    }
  }

  // Subtle brand tint that keeps heat/activity layers visually dominant.
  if (m.getLayer(MAP_BRAND_TINT_LAYER)) {
    safeSetPaint(MAP_BRAND_TINT_LAYER, "background-color", "#7a3cff");
    safeSetPaint(MAP_BRAND_TINT_LAYER, "background-opacity", dayMode ? 0.04 : 0.045);
    return;
  }

  try {
    m.addLayer({
      id: MAP_BRAND_TINT_LAYER,
      type: "background",
      paint: {
        "background-color": "#7a3cff",
        "background-opacity": dayMode ? 0.04 : 0.045,
      },
    });
  } catch {
    /* style may still be settling */
  }
}

/* ================= TYPES ================= */

type Venue = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  image_url?: string | null;
  photo_url?: string | null;
  cover_image_url?: string | null;
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

function formatMilesFromMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "";
  const miles = meters / 1609.344;
  if (miles < 0.1) return "<0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function drawCampusCapGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy - 1.5);
  ctx.lineTo(cx, cy - 7.5);
  ctx.lineTo(cx + 11, cy - 1.5);
  ctx.lineTo(cx, cy + 4.5);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy + 3);
  ctx.lineTo(cx - 6.5, cy + 7.5);
  ctx.lineTo(cx + 6.5, cy + 7.5);
  ctx.lineTo(cx + 6.5, cy + 3);
  ctx.stroke();
}

function drawFoodCrossGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // crossed utensils (closer to category icon language)
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 8);
  ctx.lineTo(cx + 8, cy - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 8, cy + 8);
  ctx.lineTo(cx - 8, cy - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 9.5, cy - 5.5);
  ctx.lineTo(cx - 6.5, cy - 8.5);
  ctx.moveTo(cx - 7.5, cy - 3.5);
  ctx.lineTo(cx - 4.5, cy - 6.5);
  ctx.moveTo(cx - 5.5, cy - 1.5);
  ctx.lineTo(cx - 2.5, cy - 4.5);
  ctx.stroke();
}
function safeSetMapCursor(m: mapboxgl.Map | null, cursor: string) {
  const canvas = m?.getCanvas?.();
  if (canvas) canvas.style.cursor = cursor;
}

/** Substrings matched against `venue.category` for food-style map markers. */
const DINING_PIN_CATEGORY_MATCHERS = [
  "food",
  "restaurant",
  "eat",
  "cafe",
  "dining",
  "bistro",
  "eatery",
  "grill",
  "kitchen",
  "coffee",
  "bakery",
];

function isDiningVenueCategory(category: string | null | undefined) {
  const s = `${category ?? ""}`.toLowerCase();
  return DINING_PIN_CATEGORY_MATCHERS.some((token) => s.includes(token));
}

/** Same name hints as the Campus map filter — keep in sync when adding buildings. */
const CAMPUS_VENUE_NAME_SUBSTRINGS = [
  "ego hall",
  "johnson",
  "morgan",
  "pearson",
  "howard gittis",
  "gittis",
  "student center",
];

const CAMPUS_PIN_CATEGORY_MATCHERS = ["campus", "school", "university", "college", "dorm", "student center"];
const EVENTS_PIN_CATEGORY_MATCHERS = ["event", "music", "show", "concert", "festival", "party"];
const NIGHTLIFE_PIN_CATEGORY_MATCHERS = ["nightlife", "bar", "club", "lounge", "party"];

function isCampusVenue(v: { category: string; name: string }) {
  const source = `${v.category ?? ""}`.toLowerCase();
  if (CAMPUS_PIN_CATEGORY_MATCHERS.some((token) => source.includes(token))) return true;
  const name = `${v.name ?? ""}`.toLowerCase();
  return CAMPUS_VENUE_NAME_SUBSTRINGS.some((fragment) => name.includes(fragment));
}

type VenueCategoryIconKey = "all" | "nightlife" | "campus" | "food" | "events";

function isEventVenueCategory(category: string | null | undefined) {
  const s = `${category ?? ""}`.toLowerCase();
  return EVENTS_PIN_CATEGORY_MATCHERS.some((token) => s.includes(token));
}

function isNightlifeVenueCategory(category: string | null | undefined) {
  const s = `${category ?? ""}`.toLowerCase();
  return NIGHTLIFE_PIN_CATEGORY_MATCHERS.some((token) => s.includes(token));
}

function resolveVenueCategoryIconKey(v: { category: string; name: string }): VenueCategoryIconKey {
  if (isCampusVenue(v)) return "campus";
  if (isDiningVenueCategory(v.category)) return "food";
  if (isEventVenueCategory(v.category)) return "events";
  if (isNightlifeVenueCategory(v.category)) return "nightlife";
  return "all";
}

function markerColorForCategory(key: VenueCategoryIconKey): string {
  switch (key) {
    case "nightlife":
      return "#D946EF";
    case "campus":
      return "#3B82F6";
    case "food":
      return "#F59E0B";
    case "events":
      return "#06B6D4";
    case "all":
    default:
      return "#7A3CFF";
  }
}

function drawCategoryGlyph(
  ctx: CanvasRenderingContext2D,
  key: VenueCategoryIconKey,
  cx: number,
  cy: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (key === "nightlife") {
    // Margarita glass + straw.
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8);
    ctx.lineTo(cx + 8, cy - 8);
    ctx.lineTo(cx + 3, cy + 2);
    ctx.lineTo(cx - 3, cy + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + 2);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 8);
    ctx.lineTo(cx + 5, cy + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 12);
    ctx.lineTo(cx + 11, cy - 21);
    ctx.stroke();
  } else if (key === "campus") {
    drawCampusCapGlyph(ctx, cx, cy);
  } else if (key === "food") {
    drawFoodCrossGlyph(ctx, cx, cy);
  } else if (key === "events") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 3.2, cy - 2.6);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx + 3.6, cy + 3.1);
    ctx.lineTo(cx + 1.1, cy + 10);
    ctx.lineTo(cx - 2.2, cy + 3.4);
    ctx.lineTo(cx - 10, cy);
    ctx.lineTo(cx - 2.8, cy - 2.8);
    ctx.closePath();
    ctx.fill();
  } else {
    // All/default grid dots
    const r = 2.2;
    const points = [
      [cx - 5.5, cy - 5.5],
      [cx + 5.5, cy - 5.5],
      [cx - 5.5, cy + 5.5],
      [cx + 5.5, cy + 5.5],
    ];
    for (const [x, y] of points) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function createCategoryMarkerImage(key: VenueCategoryIconKey = "all") {
  const size = 152;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const glyphCy = size / 2;

  const fill = markerColorForCategory(key);
  const rgb = fill
    .replace("#", "")
    .match(/.{1,2}/g)
    ?.map((v) => parseInt(v, 16)) ?? [139, 92, 246];
  const [r, g, b] = rgb;
  // Draw icon-only marker (no oval/pin body/circle), with a subtle glow for legibility.
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.45)`;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  drawCategoryGlyph(ctx, key, cx, glyphCy, fill);
  ctx.shadowBlur = 0;

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
  const youRef = useRef<{ lng: number; lat: number } | null>(null);
  const selfPresenceCoordsRef = useRef<{ lng: number; lat: number } | null>(null);
  const doubleTapCycleRef = useRef<0 | 1>(0);

type VenuePerson = {
  user_id: string;
  isFriend: boolean;
  name: string;
  /** Friend is in this geozone but last presence ping is outside the “online” window (still within recent window). */
  isRecentPresence: boolean;
};

const AUTO_TOUR_PAUSE_MS = 2200;
/** Min time since last page interaction before auto checkpoint cycling may run. */
const AUTO_TOUR_IDLE_GRACE_MS = 20_000;
/** Min time between automatic checkpoint hops once idle grace has passed. */
const AUTO_TOUR_REPEAT_MS = 4_000;
const AUTO_TOUR_ARROW_GRACE_MS = 2200;


  const youMarker = useRef<mapboxgl.Marker | null>(null);
  const presenceMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const presenceMarkerTargetRef = useRef<Map<string, [number, number]>>(new Map());
  const presenceMarkerSmoothRef = useRef<Map<string, { lng: number; lat: number }>>(new Map());
  const venueClusterMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const [you, setYou] = useState<{ lng: number; lat: number } | null>(null);
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [myGhostMode, setMyGhostMode] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapDayMode, setMapDayMode] = useState(false);
  const [mapStyleEpoch, setMapStyleEpoch] = useState(0);
  const lastAppliedMapStyleRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { __ahMapReady?: boolean };
    w.__ahMapReady = mapReady;
    if (mapReady) {
      window.dispatchEvent(new CustomEvent("ah-map-ready"));
    }
    return () => {
      w.__ahMapReady = false;
    };
  }, [mapReady]);

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
  const [presenceGhostById, setPresenceGhostById] = useState<Record<string, boolean>>({});
  const presenceInterval = useRef<NodeJS.Timeout | null>(null);
const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
const [checkpointIndex, setCheckpointIndex] = useState(0);
const [autoTourPausedUntil, setAutoTourPausedUntil] = useState(0);
const [lastArrowPressAt, setLastArrowPressAt] = useState(0);
const [lastPageInteractionAt, setLastPageInteractionAt] = useState(() => Date.now());
const [autoVenueTourEnabled, setAutoVenueTourEnabled] = useState(true);
const [hasInitialMapCenter, setHasInitialMapCenter] = useState(false);
const [checkpointMotionEnabled, setCheckpointMotionEnabled] = useState(false);
const [arrivalPulseVenueId, setArrivalPulseVenueId] = useState<string | null>(null);
const [arrivalPulseUntil, setArrivalPulseUntil] = useState(0);
/** Bumps only during checkpoint arrival animation so `checkpoint_pulse` can ease without 140ms full-map churn. */
const [arrivalTick, setArrivalTick] = useState(0);
const [myProfile, setMyProfile] = useState<FriendProfile | null>(null);
const handledQueryVenueIdRef = useRef<string | null>(null);
/** Timestamp of last automatic checkpoint hop (not user arrows); used to enforce {@link AUTO_TOUR_REPEAT_MS}. */
const lastAutoTourHopAtRef = useRef(0);
/** Ignore map gesture pause handlers while a programmatic checkpoint easeTo runs (they reset idle and kill the tour). */
const programmaticCameraUntilRef = useRef(0);
/** Last real user / map-interaction time for auto-tour idle (updated synchronously — not derived from React state). */
const tourIdleSinceRef = useRef(Date.now());
const lastArrowPressAtRef = useRef(0);
const autoTourPausedUntilRef = useRef(0);
const autoVenueTourEnabledRef = useRef(true);
const checkpointsLenRef = useRef(0);
const lastHeatCheckpointIdRef = useRef<string | null>(null);
lastArrowPressAtRef.current = lastArrowPressAt;
autoTourPausedUntilRef.current = autoTourPausedUntil;
autoVenueTourEnabledRef.current = autoVenueTourEnabled;

function armProgrammaticCamera(durationMs: number) {
  const until = Date.now() + durationMs;
  if (until > programmaticCameraUntilRef.current) {
    programmaticCameraUntilRef.current = until;
  }
}

/** Mobile/WebKit: keep raster tiles and GL compositing healthy during long easeTo (main thread can stall on GeoJSON churn). */
function runRepaintPumpDuringCamera(
  m: mapboxgl.Map,
  untilMs: number
): () => void {
  const id = window.setInterval(() => {
    if (Date.now() >= untilMs) {
      window.clearInterval(id);
      return;
    }
    try {
      m.triggerRepaint();
    } catch {
      window.clearInterval(id);
    }
  }, 120);
  return () => window.clearInterval(id);
}

const isPlaywrightHarness = process.env.NEXT_PUBLIC_PLAYWRIGHT === "1";

/** Space above bottom nav + home indicator; lower = closer to nav, more map area. */
const MAP_NAV_CLEARANCE_PX = 84;
type CategoryKey = "all" | "nightlife" | "food" | "events" | "campus";
type MapPanelMode = "categories" | "friends";
const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
const [activityPlaceholderOpen, setActivityPlaceholderOpen] = useState(false);
const [panelMode, setPanelMode] = useState<MapPanelMode>("categories");
const [mapZoom, setMapZoom] = useState(14);
  const [locateWormhole, setLocateWormhole] = useState(false);
  const locateWormholeGenRef = useRef(0);
  const locateWormholeShownAtRef = useRef(0);
/** Category accent palette (brand-aligned). */
const MAP_PIN_ALL = "#7A3CFF";
const MAP_PIN_NIGHTLIFE = "#D946EF";
const MAP_PIN_CAMPUS = "#3B82F6";
const MAP_PIN_FOOD = "#F59E0B";
const MAP_PIN_EVENTS = "#06B6D4";

const NightlifeDrinkIcon = ({
  size = 11,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 7.5H19L14.2 14H9.8L5 7.5Z" />
    <path d="M12 14V19" />
    <path d="M8.5 19H15.5" />
    <path d="M15.5 6L20 2.5" />
  </svg>
);

const categoryFilters: {
  key: CategoryKey;
  label: string;
  icon: any;
  accent: string;
  matchers: string[];
}[] = [
  { key: "all", label: "All", icon: Grid3X3, accent: MAP_PIN_ALL, matchers: [] },
  { key: "nightlife", label: "Nightlife", icon: NightlifeDrinkIcon, accent: MAP_PIN_NIGHTLIFE, matchers: ["nightlife", "bar", "club", "party"] },
  {
    key: "campus",
    label: "Campus",
    icon: GraduationCap,
    accent: MAP_PIN_CAMPUS,
    matchers: ["campus", "school", "university"],
  },
  { key: "food", label: "Food", icon: UtensilsCrossed, accent: MAP_PIN_FOOD, matchers: ["food", "restaurant", "eat", "cafe"] },
  { key: "events", label: "Events", icon: Sparkles, accent: MAP_PIN_EVENTS, matchers: ["event", "music", "show", "concert"] },
];

const selectedVenue = selectedVenueId
  ? venues.find((v) => v.id === selectedVenueId) ?? null
  : null;
const queryVenueId = searchParams.get("venueId");

const filteredVenues = useMemo(() => {
  if (activeCategory === "all") return venues;
  const filter = categoryFilters.find((f) => f.key === activeCategory);
  if (!filter) return venues;
  return venues.filter((v) => {
    const source = `${v.category ?? ""}`.toLowerCase();
    const name = `${v.name ?? ""}`.toLowerCase();

    // Campus buildings (e.g. Ego Hall) often carry a "bar" category token — keep them off Nightlife.
    if (activeCategory === "nightlife") {
      if (CAMPUS_VENUE_NAME_SUBSTRINGS.some((fragment) => name.includes(fragment))) return false;
    }

    if (filter.matchers.some((token) => source.includes(token))) return true;
    if (activeCategory === "campus") {
      return CAMPUS_VENUE_NAME_SUBSTRINGS.some((fragment) => name.includes(fragment));
    }
    return false;
  });
}, [venues, activeCategory]);

function closeVenueCard() {
  setSelectedVenueId(null);
}

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
    };
  }

  const insideAll: VenuePerson[] = [];
  const nearbyAll: VenuePerson[] = [];
  const insideFriends: VenuePerson[] = [];
  const nearbyFriends: VenuePerson[] = [];

  for (const p of presence) {
    if (hiddenIds.has(p.user_id)) continue;
  if (p.user_id === meId) continue;
  if (!isValidCoordinatePair(p.lat, p.lng)) continue;
  if (presenceGhostById[p.user_id]) continue;
  const freshness = getPresenceFreshness(p.updated_at, now);
  if (freshness === "stale") continue;
  const isOnlineNow = freshness === "live";
  const isRecentlySeen = freshness === "recent";

  const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);
  const isFriend = p.user_id in friendsById;

  // ✅ FILTER LOGIC (THIS IS THE FIX)
  if (!isFriend && d > venue.outer_radius_m) continue;
  

    const item: VenuePerson = {
      user_id: p.user_id,
      isFriend,
      name: isFriend ? usernamesById[p.user_id] ?? "Friend" : "Someone",
      isRecentPresence: isFriend && !isOnlineNow && isRecentlySeen,
    };

    if (d <= venue.inner_radius_m) {
      insideAll.push(item);
      if (isFriend) {
        insideFriends.push(item);
      }
    } else if (d <= venue.outer_radius_m) {
      nearbyAll.push(item);
      if (isFriend) {
        nearbyFriends.push(item);
      }
    }
  }

  return {
    insideAll,
    nearbyAll,
    insideFriends,
    nearbyFriends,
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
  const { data, error: frError } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`);

  if (frError) {
    console.error("Map: friend_requests load error:", frError);
    return;
  }
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

  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, ghost_mode")
    .in("id", ids);

  if (profError) {
    console.error("Map: friend profiles load error:", profError);
    return;
  }
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
  if (!isValidCoordinatePair(you.lat, you.lng)) return;

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
  return formatRelativeTime(ts, { includeAgo: false, nowLabel: "online" });
}

  /* ---------------- GEO ---------------- */

  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setYou({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        }),
      () => {
        // Never fall back to fake coordinates; keep last real GPS (or null).
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    const refreshLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setYou({
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
          });
        },
        () => {
          /* permission denied or unavailable */
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshLocation();
    };
    const onFocus = () => refreshLocation();
    const onPageShow = () => refreshLocation();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

 

  /* ---------------- MAP INIT ---------------- */

useEffect(() => {
  if (!mapRef.current || map.current) return;

  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const initialDay = localHourIsMapDaytime();
  const styleUrl = mapStyleUrlForDayMode(initialDay);
  setMapDayMode(initialDay);
  lastAppliedMapStyleRef.current = styleUrl;

  const m = new mapboxgl.Map({
    container: mapRef.current,
    style: styleUrl,
    center: [MAP_FALLBACK_CENTER_LNG, MAP_FALLBACK_CENTER_LAT], // stable default until GPS / presence
    zoom: 14,
  });

  map.current = m;
  m.doubleClickZoom.disable();
  m.dragRotate.disable();
  m.touchZoomRotate.disableRotation();

  let removeMapIdlePointerListener: (() => void) | null = null;

  // Register before Mapbox finishes attaching handlers so capture runs first and Inspect / two‑finger click works.
  let removeNativeContextMenuListener: (() => void) | null = null;
  try {
    const canvas = m.getCanvas();
    const unblockInspectMenu = (domEv: Event) => {
      domEv.stopImmediatePropagation();
    };
    canvas.addEventListener("contextmenu", unblockInspectMenu, { capture: true });
    removeNativeContextMenuListener = () =>
      canvas.removeEventListener("contextmenu", unblockInspectMenu, { capture: true });
  } catch {
    removeNativeContextMenuListener = null;
  }

  m.on("load", () => {
    applyMapAtmosphereForMode(m, initialDay);
    applyBrandedBasemapTheme(m, initialDay);
    setMapReady(true);
    // Do not setHasInitialMapCenter here: auto-tour must wait until the first GPS centering
    // easeTo runs; otherwise checkpoint easeTo races it and feels like a teleport on desktop.

    // Only touches that start on the map (not the top chrome / venue panel) restart the 17s
    // idle clock — otherwise phones rarely reach idle and auto-tour never advances.
    const container = m.getContainer();
    const onMapPointerIdleReset = () => {
      const t = Date.now();
      tourIdleSinceRef.current = t;
      lastAutoTourHopAtRef.current = 0;
      setLastPageInteractionAt(t);
    };
    container.addEventListener("pointerdown", onMapPointerIdleReset);
    removeMapIdlePointerListener = () =>
      container.removeEventListener("pointerdown", onMapPointerIdleReset);
  });
  m.on("zoomend", () => setMapZoom(m.getZoom()));

  return () => {
    lastAppliedMapStyleRef.current = null;
    removeMapIdlePointerListener?.();
    removeNativeContextMenuListener?.();
    m.remove();
    map.current = null;
  };
}, []);

  useEffect(() => {
    const tick = () => setMapDayMode(localHourIsMapDaytime());
    tick();
    const id = window.setInterval(tick, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const url = mapStyleUrlForDayMode(mapDayMode);
    if (lastAppliedMapStyleRef.current === url) return;

    lastAppliedMapStyleRef.current = url;
    const targetDay = mapDayMode;

    let cancelled = false;
    const onStyleLoad = () => {
      m.off("style.load", onStyleLoad);
      if (cancelled) return;
      applyMapAtmosphereForMode(m, targetDay);
      applyBrandedBasemapTheme(m, targetDay);
      setMapStyleEpoch((e) => e + 1);
    };

    m.on("style.load", onStyleLoad);
    m.setStyle(url);

    return () => {
      cancelled = true;
      try {
        m.off("style.load", onStyleLoad);
      } catch {
        /* map destroyed */
      }
    };
  }, [mapDayMode, mapReady]);

/* ---------------- FOLLOW USER ---------------- */

useEffect(() => {
  if (!map.current || !you) return;
  youRef.current = you;
  if (hasCenteredToUser.current) return;
  hasCenteredToUser.current = true;

  armProgrammaticCamera(1200);
  map.current.easeTo({
    center: [you.lng, you.lat],
    duration: 800,
    essential: true,
  });
  setHasInitialMapCenter(true);
}, [you]);

/** If GPS is slow or denied, still allow the venue tour after the map is ready (same behavior every device). */
useEffect(() => {
  if (!mapReady) return;
  const id = window.setTimeout(() => {
    setHasInitialMapCenter((v) => v || true);
  }, 5000);
  return () => window.clearTimeout(id);
}, [mapReady]);

useEffect(() => {
  youRef.current = you;
}, [you]);

useEffect(() => {
  if (!meId) {
    selfPresenceCoordsRef.current = null;
    return;
  }
  const mine = presence.find((p) => p.user_id === meId);
  if (!mine || !isValidCoordinatePair(mine.lat, mine.lng)) return;
  selfPresenceCoordsRef.current = { lng: mine.lng, lat: mine.lat };
}, [presence, meId]);

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

useEffect(() => {
  const m = map.current;
  if (!m || !mapReady) return;
  const onResize = () => {
    try {
      m.resize();
    } catch {
      /* map destroyed */
    }
  };
  window.addEventListener("resize", onResize);
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  vv?.addEventListener("resize", onResize);
  vv?.addEventListener("scroll", onResize);
  onResize();
  return () => {
    window.removeEventListener("resize", onResize);
    vv?.removeEventListener("resize", onResize);
    vv?.removeEventListener("scroll", onResize);
  };
}, [mapReady]);

  const beginLocateWormhole = useCallback(() => {
    locateWormholeGenRef.current += 1;
    const gen = locateWormholeGenRef.current;
    locateWormholeShownAtRef.current = Date.now();
    setLocateWormhole(true);
    return gen;
  }, []);

  const finishLocateWormholeAfterIdle = useCallback((m: mapboxgl.Map, gen: number) => {
    const tryHide = () => {
      if (gen !== locateWormholeGenRef.current) return;
      const elapsed = Date.now() - locateWormholeShownAtRef.current;
      if (elapsed < LOCATE_WORMHOLE_MIN_MS) {
        window.setTimeout(tryHide, LOCATE_WORMHOLE_MIN_MS - elapsed);
        return;
      }
      if (gen === locateWormholeGenRef.current) setLocateWormhole(false);
    };

    const onIdle = () => {
      m.off("idle", onIdle);
      if (gen !== locateWormholeGenRef.current) return;
      tryHide();
    };
    m.once("idle", onIdle);
    window.setTimeout(() => {
      m.off("idle", onIdle);
      tryHide();
    }, LOCATE_WORMHOLE_MAX_MS);
  }, []);

const runLocateCycle = useCallback(() => {
  const m = map.current;
  if (!m) return;

  const centerTo = (coords: { lng: number; lat: number }) => {
    const wormholeGen = beginLocateWormhole();
    const now = Date.now();
    tourIdleSinceRef.current = now;
    lastAutoTourHopAtRef.current = 0;
    const until = now + AUTO_TOUR_PAUSE_MS;
    autoTourPausedUntilRef.current = until;
    setLastPageInteractionAt(now);
    setAutoTourPausedUntil(until);

    if (doubleTapCycleRef.current === 0) {
      // 1) Zoom to the target (you, venue center when checked in / sheet open, etc.).
      armProgrammaticCamera(700);
      m.easeTo({
        center: [coords.lng, coords.lat],
        zoom: Math.max(15.5, m.getZoom()),
        pitch: 0,
        bearing: 0,
        duration: 520,
        essential: true,
      });
      doubleTapCycleRef.current = 1;
      finishLocateWormholeAfterIdle(m, wormholeGen);
      return;
    }

    // 2) Next press zooms to earth-level view, centered on you.
    armProgrammaticCamera(900);
    m.easeTo({
      center: [coords.lng, coords.lat],
      zoom: 1.65,
      pitch: 0,
      bearing: 0,
      duration: 760,
      essential: true,
    });
    doubleTapCycleRef.current = 0;
    finishLocateWormholeAfterIdle(m, wormholeGen);
  };

  // Venue you’re viewing on the sheet (or `?venueId=`) — prefer this over stale GPS.
  if (
    selectedVenue &&
    isValidCoordinatePair(selectedVenue.lat, selectedVenue.lng)
  ) {
    centerTo({ lng: selectedVenue.lng, lat: selectedVenue.lat });
    return;
  }

  // Checked into a venue per presence — center the place, not a lagging device fix.
  if (meId && venues.length) {
    const mine = presence.find((p) => p.user_id === meId);
    const vid = mine?.venue_id;
    if (vid) {
      const v = venues.find((x) => x.id === vid);
      if (v && isValidCoordinatePair(v.lat, v.lng)) {
        centerTo({ lng: v.lng, lat: v.lat });
        return;
      }
    }
  }

  const coordsFromYou = youRef.current;
  if (coordsFromYou && isValidCoordinatePair(coordsFromYou.lat, coordsFromYou.lng)) {
    centerTo(coordsFromYou);
    return;
  }

  const coordsFromPresence = selfPresenceCoordsRef.current;
  if (coordsFromPresence && isValidCoordinatePair(coordsFromPresence.lat, coordsFromPresence.lng)) {
    centerTo(coordsFromPresence);
    return;
  }

  // If local presence has not hydrated yet, force a fresh GPS read.
  if (!navigator.geolocation) return;
  const wormholeGen = beginLocateWormhole();
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
      setYou(coords);
      const now = Date.now();
      tourIdleSinceRef.current = now;
      lastAutoTourHopAtRef.current = 0;
      const until = now + AUTO_TOUR_PAUSE_MS;
      autoTourPausedUntilRef.current = until;
      setLastPageInteractionAt(now);
      setAutoTourPausedUntil(until);

      if (doubleTapCycleRef.current === 0) {
        armProgrammaticCamera(700);
        m.easeTo({
          center: [coords.lng, coords.lat],
          zoom: Math.max(15.5, m.getZoom()),
          pitch: 0,
          bearing: 0,
          duration: 520,
          essential: true,
        });
        doubleTapCycleRef.current = 1;
      } else {
        armProgrammaticCamera(900);
        m.easeTo({
          center: [coords.lng, coords.lat],
          zoom: 1.65,
          pitch: 0,
          bearing: 0,
          duration: 760,
          essential: true,
        });
        doubleTapCycleRef.current = 0;
      }
      finishLocateWormholeAfterIdle(m, wormholeGen);
    },
    () => {
      locateWormholeGenRef.current += 1;
      setLocateWormhole(false);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}, [
  beginLocateWormhole,
  finishLocateWormholeAfterIdle,
  selectedVenue,
  meId,
  venues,
  presence,
]);


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
  if (!isValidCoordinatePair(p.lat, p.lng)) continue;
  if (!isPresenceLive(p.updated_at, now)) continue;

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
  return filteredVenues
    .map((v) => {
      const { redTotal, greenTotal } = getCountsForVenue(v.id, presence, friendsById, filteredVenues, meId);
      const activity = (redTotal ?? 0) + (greenTotal ?? 0);
      const fallbackMine = meId
        ? presence.find((p) => p.user_id === meId && isValidCoordinatePair(p.lat, p.lng)) ?? null
        : null;
      const fallbackSelf = selfPresenceCoordsRef.current;
      const sourceCoords =
        (you && isValidCoordinatePair(you.lat, you.lng) ? { lat: you.lat, lng: you.lng } : null) ??
        (fallbackMine ? { lat: fallbackMine.lat, lng: fallbackMine.lng } : null) ??
        (fallbackSelf && isValidCoordinatePair(fallbackSelf.lat, fallbackSelf.lng)
          ? { lat: fallbackSelf.lat, lng: fallbackSelf.lng }
          : null);
      const distanceFromYou = sourceCoords
        ? distanceMeters(sourceCoords.lat, sourceCoords.lng, v.lat, v.lng)
        : Number.MAX_SAFE_INTEGER;
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
}, [filteredVenues, presence, friendsById, meId, you]);

checkpointsLenRef.current = checkpoints.length;

const selectedVenuePeople = useMemo(() => {
  if (!selectedVenue) {
    return {
      insideAll: [] as VenuePerson[],
      nearbyAll: [] as VenuePerson[],
      insideFriends: [] as VenuePerson[],
      nearbyFriends: [] as VenuePerson[],
    };
  }
  return getVenuePeople(selectedVenue.id);
}, [selectedVenue, presence, hiddenIds, meId, friendsById, usernamesById, venues, presenceGhostById]);

const currentUserCoords = useMemo(() => {
  if (you && isValidCoordinatePair(you.lat, you.lng)) {
    return { lat: you.lat, lng: you.lng };
  }
  if (meId) {
    const mine = presence.find((p) => p.user_id === meId && isValidCoordinatePair(p.lat, p.lng));
    if (mine) return { lat: mine.lat, lng: mine.lng };
  }
  const fallback = selfPresenceCoordsRef.current;
  if (fallback && isValidCoordinatePair(fallback.lat, fallback.lng)) {
    return { lat: fallback.lat, lng: fallback.lng };
  }
  return null;
}, [you, meId, presence]);

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
  const targetZoom = Math.max(15.75, Math.min(17.05, dynamicZoom));
  const zoomSpan = Math.abs(targetZoom - currentZoom);
  const duration = Math.min(2600, Math.max(1000, 820 + zoomSpan * 520));
  armProgrammaticCamera(Math.ceil(2200 + duration + 120));
  const cameraUntilMs = programmaticCameraUntilRef.current;
  let cancelRepaintPump = runRepaintPumpDuringCamera(m, cameraUntilMs);

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    cancelRepaintPump();
    window.clearTimeout(safetyTimer);
    setCheckpointMotionEnabled(false);
  };
  // Safari: do not rely on `moveend` (can coalesce oddly with wheel zoom). Timer matches ease duration.
  const safetyTimer = window.setTimeout(finish, duration + 180);

  try {
    m.resize();
    m.easeTo({
      center: [activeCheckpoint.lng, activeCheckpoint.lat],
      zoom: targetZoom,
      pitch: 52,
      duration,
      easing: (t) => t * (2 - t),
      essential: true,
    });
    setArrivalPulseVenueId(activeCheckpoint.id);
    setArrivalPulseUntil(Date.now() + 1600);
  } catch {
    finish();
  }

  return () => {
    settled = true;
    cancelRepaintPump();
    window.clearTimeout(safetyTimer);
    setCheckpointMotionEnabled(false);
  };
}, [activeCheckpoint?.id, checkpointMotionEnabled]);

useEffect(() => {
  if (!map.current) return;
  /**
   * Desktop (esp. Mac trackpad) emits wheel zoom → `zoomstart` constantly; that was resetting
   * `tourIdleSinceRef` and killing the auto-tour idle grace. Phones rarely hit that pattern.
   * Only a real pan (`dragstart`) + pointerdown on the map container reset full idle; wheel/pinch zoom
   * only applies a short hop pause without resetting the idle clock.
   */
  const onPanIntent = () => {
    if (Date.now() < programmaticCameraUntilRef.current) return;
    const now = Date.now();
    tourIdleSinceRef.current = now;
    lastAutoTourHopAtRef.current = 0;
    const until = now + AUTO_TOUR_PAUSE_MS;
    autoTourPausedUntilRef.current = until;
    setLastPageInteractionAt(now);
    setAutoTourPausedUntil(until);
  };
  const onCameraGesture = () => {
    if (Date.now() < programmaticCameraUntilRef.current) return;
    const now = Date.now();
    const until = now + AUTO_TOUR_PAUSE_MS;
    autoTourPausedUntilRef.current = until;
    setAutoTourPausedUntil(until);
  };
  const m = map.current;
  m.on("dragstart", onPanIntent);
  m.on("zoomstart", onCameraGesture);
  m.on("rotatestart", onCameraGesture);
  m.on("pitchstart", onCameraGesture);

  return () => {
    m.off("dragstart", onPanIntent);
    m.off("zoomstart", onCameraGesture);
    m.off("rotatestart", onCameraGesture);
    m.off("pitchstart", onCameraGesture);
  };
}, [mapReady]);

useEffect(() => {
  if (!hasInitialMapCenter) return;
  if (checkpoints.length < 2) return;
  const tickMs = 1000;
  const timer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (typeof window !== "undefined" && window.localStorage.getItem("map_auto_venue_tour_enabled") === "false") {
      return;
    }
    if (!autoVenueTourEnabledRef.current) return;
    const now = Date.now();
    if (now < autoTourPausedUntilRef.current) return;
    if (now < programmaticCameraUntilRef.current) return;
    if (now - tourIdleSinceRef.current < AUTO_TOUR_IDLE_GRACE_MS) return;
    if (
      lastArrowPressAtRef.current > 0 &&
      now - lastArrowPressAtRef.current < AUTO_TOUR_ARROW_GRACE_MS
    ) {
      return;
    }
    if (lastAutoTourHopAtRef.current && now - lastAutoTourHopAtRef.current < AUTO_TOUR_REPEAT_MS) return;
    const n = checkpointsLenRef.current;
    if (n < 2) return;
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((prev) => (prev + 1) % n);
    lastAutoTourHopAtRef.current = now;
  }, tickMs);
  return () => clearInterval(timer);
}, [hasInitialMapCenter, checkpoints.length]);

useEffect(() => {
  if (!arrivalPulseVenueId) return;
  const msLeft = arrivalPulseUntil - Date.now();
  if (msLeft <= 0) return;
  const id = window.setInterval(() => {
    setArrivalTick((n) => n + 1);
  }, 160);
  const stop = window.setTimeout(() => window.clearInterval(id), msLeft + 120);
  return () => {
    window.clearInterval(id);
    window.clearTimeout(stop);
  };
}, [arrivalPulseVenueId, arrivalPulseUntil]);

useEffect(() => {
  if (typeof window === "undefined") return;
  const readSetting = () => {
    const stored = window.localStorage.getItem("map_auto_venue_tour_enabled");
    if (stored === null) {
      window.localStorage.setItem("map_auto_venue_tour_enabled", "true");
      autoVenueTourEnabledRef.current = true;
      setAutoVenueTourEnabled(true);
      return;
    }
    const on = stored !== "false";
    autoVenueTourEnabledRef.current = on;
    setAutoVenueTourEnabled(on);
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
  tourIdleSinceRef.current = now;
  lastAutoTourHopAtRef.current = 0;
  const until = now + AUTO_TOUR_PAUSE_MS;
  autoTourPausedUntilRef.current = until;
  setLastPageInteractionAt(now);
  setAutoTourPausedUntil(until);
  armProgrammaticCamera(1100);
  m.easeTo({
    center: [target.lng, target.lat],
    zoom: Math.max(m.getZoom(), 15.8),
    duration: 950,
    essential: true,
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

    const markerImageEntries: Array<[string, VenueCategoryIconKey]> = [
      ["venue-category-all", "all"],
      ["venue-category-nightlife", "nightlife"],
      ["venue-category-campus", "campus"],
      ["venue-category-food", "food"],
      ["venue-category-events", "events"],
    ];
    for (const [imageId, categoryKey] of markerImageEntries) {
      if (m.hasImage(imageId)) continue;
      const markerImage = createCategoryMarkerImage(categoryKey);
      if (markerImage) {
        m.addImage(imageId, markerImage, { pixelRatio: 2 });
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
        "heatmap-intensity": HEATMAP_INTENSITY_BASE_EXPR,
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 4,
          4, 10,
          8, 20,
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
          0, "rgba(148,163,184,0.06)",      // no people: transparent gray haze
          0.18, "#7dd3fc",                  // some: ice blue
          0.42, "#14b8a6",                  // growing: teal
          0.72, "#ff2ea6",                  // busy: hot pink
          1, "#7a3cff",                     // packed: electric purple
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
          "rgba(148,163,184,0.34)",
          1, "#7dd3fc",
          4, "#14b8a6",
          9, "#ff2ea6",
          16, "#7a3cff",
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, [
            "interpolate",
            ["linear"],
            [
              "+",
              ["coalesce", ["get", "combined_count"], 0],
              ["*", 6, ["coalesce", ["get", "checkpoint_pulse"], 0]],
              ["*", 1.8, ["coalesce", ["get", "ambient_pulse"], 0]],
            ],
            0, 2,
            6, 6,
            15, 10,
            30, 13,
          ],
          8, [
            "interpolate",
            ["linear"],
            [
              "+",
              ["coalesce", ["get", "combined_count"], 0],
              ["*", 6, ["coalesce", ["get", "checkpoint_pulse"], 0]],
              ["*", 1.8, ["coalesce", ["get", "ambient_pulse"], 0]],
            ],
            0, 10,
            6, 20,
            15, 28,
            30, 34,
          ],
          14, [
            "interpolate",
            ["linear"],
            [
              "+",
              ["coalesce", ["get", "combined_count"], 0],
              ["*", 6, ["coalesce", ["get", "checkpoint_pulse"], 0]],
              ["*", 1.8, ["coalesce", ["get", "ambient_pulse"], 0]],
            ],
            0, 42,
            2, 58,
            6, 90,
            11, 130,
            17, 185,
            25, 240,
          ],
        ],
        "circle-blur": 0.9,
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "combined_count"], 0],
          0, 0.12,
          1, 0.28,
          6, 0.38,
          12, 0.5,
          18, 0.62,
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
          "rgba(148,163,184,0.32)",
          1, "#7dd3fc",
          4, "#14b8a6",
          9, "#ff2ea6",
          16, "#7a3cff",
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, [
            "interpolate",
            ["linear"],
            [
              "+",
              ["coalesce", ["get", "combined_count"], 0],
              ["*", 3, ["coalesce", ["get", "checkpoint_pulse"], 0]],
              ["*", 0.9, ["coalesce", ["get", "ambient_pulse"], 0]],
            ],
            0, 1,
            10, 4,
            25, 6,
          ],
          8, [
            "interpolate",
            ["linear"],
            [
              "+",
              ["coalesce", ["get", "combined_count"], 0],
              ["*", 3, ["coalesce", ["get", "checkpoint_pulse"], 0]],
              ["*", 0.9, ["coalesce", ["get", "ambient_pulse"], 0]],
            ],
            0, 4,
            10, 8,
            25, 12,
          ],
          14, [
            "interpolate",
            ["linear"],
            [
              "+",
              ["coalesce", ["get", "combined_count"], 0],
              ["*", 3, ["coalesce", ["get", "checkpoint_pulse"], 0]],
              ["*", 0.9, ["coalesce", ["get", "ambient_pulse"], 0]],
            ],
            0, 10,
            2, 14,
            6, 20,
            11, 28,
            17, 36,
            25, 44,
          ],
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
        "icon-image": [
          "match",
          ["get", "category_icon"],
          "nightlife",
          "venue-category-nightlife",
          "campus",
          "venue-category-campus",
          "food",
          "venue-category-food",
          "events",
          "venue-category-events",
          "venue-category-all",
        ],
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 0.28,
          4, 0.4,
          8, 0.66,
          10, 1.16,
          14, 1.42,
          18, 1.58,
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-sort-key": ["*", -1, ["coalesce", ["get", "combined_count"], 0]],
      },
      paint: {
        "icon-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 12], 0.88, 0],
          6,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 8], 0.9, 0],
          9,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 4], 0.92, 0],
          11.5,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 1], 0.93, 0.08],
          14,
          0.95,
        ],
      },
    });

    m.addLayer({
      id: VENUE_NAME_LABEL_LAYER,
      type: "symbol",
      source: VENUE_ACTIVITY_SOURCE,
      minzoom: 11.6,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11.6, 11.5,
          14, 14,
          18, 16,
        ],
        "text-offset": [0, 1.55],
        "text-letter-spacing": 0.03,
        "text-anchor": "top",
        "text-max-width": 14,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "symbol-sort-key": ["*", -1, ["coalesce", ["get", "combined_count"], 0]],
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
        "text-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 12], 0.88, 0],
          6,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 8], 0.9, 0],
          9,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 4], 0.92, 0],
          11.5,
          ["case", [">=", ["coalesce", ["get", "combined_count"], 0], 1], 0.93, 0.08],
          14,
          0.95,
        ],
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

      const now = Date.now();
      tourIdleSinceRef.current = now;
      setLastPageInteractionAt(now);
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
  }, [mapReady, mapStyleEpoch]);

  /* ---------------- VENUE HEAT FLOORS: data only (no layer churn) ---------------- */
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const src = m.getSource(VENUE_ACTIVITY_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    const cpId = activeCheckpoint?.id ?? null;
    const cpChanged = cpId !== lastHeatCheckpointIdRef.current;
    lastHeatCheckpointIdRef.current = cpId;

    const features = filteredVenues.map((v) => {
      const { redTotal, greenTotal } = getCountsForVenue(
        v.id,
        presence,
        friendsById,
        filteredVenues,
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
          category_icon: resolveVenueCategoryIconKey(v),
          inside_count: inside,
          nearby_count: nearby,
          combined_count: combined,
          checkpoint_active: isActiveCheckpoint ? 1 : 0,
          checkpoint_pulse: pulseProgress,
          /** Breathing motion comes from global `heatmap-intensity` pulse (see rAF) — avoids rewriting all venues every frame. */
          ambient_pulse: 0,
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
    filteredVenues,
    presence,
    friendsById,
    meId,
    mapReady,
    mapStyleEpoch,
    hiddenIds,
    activeCheckpoint?.id,
    arrivalPulseVenueId,
    arrivalPulseUntil,
    arrivalTick,
  ]);

  /** Global heatmap “breathing” (~5Hz): one cheap paint update, not full GeoJSON per venue per tick. */
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const layerId = VENUE_HEAT_LAYER;
    const id = window.setInterval(() => {
      const wave = 0.88 + 0.12 * ((Math.sin(Date.now() / 520) + 1) / 2);
      try {
        if (m.getLayer(layerId)) {
          m.setPaintProperty(layerId, "heatmap-intensity", [
            "*",
            ["literal", wave],
            HEATMAP_INTENSITY_BASE_EXPR,
          ]);
        }
      } catch {
        /* style swap / teardown */
      }
    }, 200);
    return () => {
      window.clearInterval(id);
      try {
        if (m.getLayer(layerId)) {
          m.setPaintProperty(layerId, "heatmap-intensity", HEATMAP_INTENSITY_BASE_EXPR);
        }
      } catch {
        /* noop */
      }
    };
  }, [mapReady, mapStyleEpoch]);

/* ---------------- DEV RADII ---------------- */

useEffect(() => {
  if (!SHOW_DEV_RADII) return;

  const m = map.current;
  if (!m || !mapReady) return;

  for (const v of filteredVenues) {
  

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
}, [filteredVenues, mapReady]);

useEffect(() => {
  if (!selectedVenueId) return;
  const exists = filteredVenues.some((v) => v.id === selectedVenueId);
  if (!exists) {
    setSelectedVenueId(null);
  }
}, [filteredVenues, selectedVenueId]);

useEffect(() => {
  window.dispatchEvent(
    new CustomEvent("map-venue-sheet-visibility", {
      detail: { open: !!selectedVenue },
    })
  );
  return () => {
    window.dispatchEvent(
      new CustomEvent("map-venue-sheet-visibility", {
        detail: { open: false },
      })
    );
  };
}, [selectedVenue]);


  /* ---------------- SAVE PRESENCE (STABLE) ---------------- */

  useEffect(() => {
  if (!you || !meId || venues.length === 0) return;
  if (!isValidCoordinatePair(you.lat, you.lng)) return;
 // if (hasRunInitialPresence.current) return;


    const run = async () => {
      const { data: prev } = await supabase
  .from("user_presence")
  .select("venue_id, venue_state, entered_inner_at, updated_at, lat, lng")
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
        const hourBucket = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getHours()}`;
        const dayBucket = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
        const actorLabel =
          myProfile?.display_name?.trim() ||
          myProfile?.username?.trim() ||
          "A friend";
        const venueLabel =
          venueId && venues.length
            ? venues.find((v) => v.id === venueId)?.name?.trim() || "a venue"
            : "a venue";

        // Notify friends when coming online (dedupe: at most once per friend per actor per local hour).
        if (!wasRecentlyOnline && nowRecentlyOnline) {
          for (const fid of friendIds) {
            const p = prefs.get(fid);
            if (p?.online === false) continue;
            await createNotification({
              recipientId: fid,
              actorId: meId,
              type: "friend_online",
              dedupeKey: `friend_online:${fid}:${meId}:${hourBucket}`,
              pushTitle: `${actorLabel} is active`,
              pushBody: "Your friend is on the map.",
              route: "/map",
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
              dedupeKey: `friend_joined_venue:${fid}:${meId}:${venueId}:${dayBucket}`,
              pushTitle: `${actorLabel} is at ${venueLabel}`,
              pushBody: "Open the map to see where they checked in.",
              route: venueId ? `/map?venueId=${encodeURIComponent(venueId)}` : "/map",
            });
          }
        }

        const canSendNearby = !venueId;
        if (canSendNearby) {
          const [{ data: friendPresenceRows }, { data: ghostRows }] = await Promise.all([
            supabase
              .from("user_presence")
              .select("user_id, lat, lng, venue_id, updated_at")
              .in("user_id", friendIds),
            supabase
              .from("profiles")
              .select("id, ghost_mode")
              .in("id", friendIds),
          ]);
          const friendGhostMap: Record<string, boolean> = {};
          for (const row of (ghostRows ?? []) as Array<{ id: string; ghost_mode: boolean | null }>) {
            friendGhostMap[row.id] = !!row.ghost_mode;
          }
          const nearbyThresholdM = 300;
          for (const fp of (friendPresenceRows ?? []) as Array<{ user_id: string; lat: number; lng: number; venue_id: string | null; updated_at: string }>) {
            const p = prefs.get(fp.user_id);
            if (p?.online === false) continue;
            if (friendGhostMap[fp.user_id]) continue;
            if (!isValidCoordinatePair(fp.lat, fp.lng)) continue;
            if (!isPresenceLive(fp.updated_at)) continue;
            if (fp.venue_id) continue;
            const d = distanceMeters(you.lat, you.lng, fp.lat, fp.lng);
            if (d > nearbyThresholdM) continue;
            const prevDist = prev?.lat != null && prev?.lng != null
              ? distanceMeters(prev.lat, prev.lng, fp.lat, fp.lng)
              : Number.POSITIVE_INFINITY;
            const crossedIntoNearby = prevDist > nearbyThresholdM;
            if (!crossedIntoNearby) continue;
            await createNotification({
              recipientId: fp.user_id,
              actorId: meId,
              type: "friend_nearby",
              dedupeKey: `friend_nearby:${fp.user_id}:${meId}:${hourBucket}`,
              pushTitle: `${actorLabel} is nearby`,
              pushBody: "A friend is close on the map.",
              route: "/map",
            });
          }
        }
      }

      hasRunInitialPresence.current = true;

    };

    run();
  }, [you, meId, venues, myProfile]);


  

  /* ---------------- LOAD PRESENCE (VISIBILITY-AWARE) ---------------- */

useEffect(() => {
  let mounted = true;

  const load = async () => {
   const { data, error: presenceError } = await supabase
  .from("user_presence")
  .select("user_id, lng, lat, updated_at, venue_id, venue_state, zone_type");

    if (presenceError) {
      console.error("Map: user_presence load error:", presenceError);
    }

    if (mounted) {
      const rows = (data ?? []) as PresenceRow[];
      setPresence(rows);
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      if (!userIds.length) {
        setPresenceGhostById({});
        return;
      }
      const { data: ghostRows } = await supabase
        .from("profiles")
        .select("id, ghost_mode")
        .in("id", userIds);
      if (!mounted) return;
      const ghostMap: Record<string, boolean> = {};
      for (const row of (ghostRows ?? []) as Array<{ id: string; ghost_mode: boolean | null }>) {
        ghostMap[row.id] = !!row.ghost_mode;
      }
      setPresenceGhostById(ghostMap);
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


  const openFriendProfile = useCallback(
    (userId: string) => {
      const un =
        friendProfilesById[userId]?.username?.trim() ||
        usernamesById[userId]?.trim();
      if (un) router.push(`/u/${encodeURIComponent(un)}`);
      else router.push(`/profile/${userId}`);
    },
    [router, friendProfilesById, usernamesById]
  );

  /* ---------------- FRIEND PFP + VENUE CLUSTERS ---------------- */
  useEffect(() => {
    const m = map.current;
    presenceMarkers.current.forEach((marker) => marker.remove());
    presenceMarkers.current.clear();
    venueClusterMarkers.current.forEach((marker) => marker.remove());
    venueClusterMarkers.current.clear();
    if (!m || !mapReady) return;
    /** Avoid stacking friend/me pins at the default Philly center before venues exist (no radii → everyone looks “out of venue”). */
    if (!venues.length) {
      presenceMarkerTargetRef.current.clear();
      presenceMarkerSmoothRef.current.clear();
      return;
    }

    const now = Date.now();
    const activeThresholdMs = LIVE_WINDOW_MS;
    const latestKnownPresenceByUser = new Map<string, PresenceRow>();
    const latestPresenceByUser = new Map<string, PresenceRow>();
    const activePresenceByUser = new Map<string, PresenceRow>();

    for (const p of presence) {
      if (!isValidCoordinatePair(p.lat, p.lng)) continue;
      const lastMs = new Date(p.updated_at).getTime();

      const prevKnown = latestKnownPresenceByUser.get(p.user_id);
      if (!prevKnown || new Date(prevKnown.updated_at).getTime() < lastMs) {
        latestKnownPresenceByUser.set(p.user_id, p);
      }

      if (getPresenceFreshness(p.updated_at, now) === "stale") continue;
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
    const markerSizeForZoom = (zoom: number) => {
      // Keep avatars compact; shrink progressively as user zooms out.
      const minSize = 13;
      const maxSize = 30;
      const t = Math.max(0, Math.min(1, (zoom - 4) / 10));
      return Math.round(minSize + (maxSize - minSize) * t);
    };
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

    const isGlobeView = mapZoom < 8;
    const placedPresenceMarkerIds = new Set<string>();
    const coordinateKeyForPresence = (p: PresenceRow) =>
      `${p.lat.toFixed(5)}:${p.lng.toFixed(5)}`;
    const nonVenueOverlapGroups = new Map<string, string[]>();

    if (!isGlobeView) {
      for (const id of candidateIds) {
        const latestP = latestKnownPresenceByUser.get(id);
        if (!latestP) continue;
        if (isLikelyMapFallbackPresence(latestP.lat, latestP.lng)) continue;
        if (hiddenIds.has(id)) continue;
        const isMe = id === meId;
        const isFriend = !!friendsById[id];
        if (!isMe && !isFriend) continue;
        const ghost = isMe ? myGhostMode : (presenceGhostById[id] ?? !!friendProfilesById[id]?.ghost_mode);
        if (!isMe && ghost) continue;
        if (findContainingVenue(latestP)) continue;
        const p = isMe
          ? activePresenceByUser.get(id)
          : (activePresenceByUser.get(id) ?? latestKnownPresenceByUser.get(id));
        if (!p) continue;
        const key = coordinateKeyForPresence(p);
        const bucket = nonVenueOverlapGroups.get(key) ?? [];
        bucket.push(id);
        nonVenueOverlapGroups.set(key, bucket);
      }
    }

    const markerOffsetPosition = (
      p: PresenceRow,
      id: string
    ): [number, number] => {
      const key = coordinateKeyForPresence(p);
      const group = nonVenueOverlapGroups.get(key);
      if (!group || group.length <= 1) return [p.lng, p.lat];
      const idx = Math.max(0, group.indexOf(id));
      const angle = (idx / group.length) * Math.PI * 2;
      const radiusMeters = Math.min(22, Math.max(7, 5 + group.length * 1.5));
      const latRad = (p.lat * Math.PI) / 180;
      const safeCos = Math.max(0.2, Math.cos(latRad));
      const dLat = (radiusMeters / 111320) * Math.sin(angle);
      const dLng = (radiusMeters / (111320 * safeCos)) * Math.cos(angle);
      return [p.lng + dLng, p.lat + dLat];
    };

    for (const id of candidateIds) {
      const latestP = latestKnownPresenceByUser.get(id);
      if (!latestP) continue;
      if (hiddenIds.has(id)) continue;

      const isMe = id === meId;
      const isFriend = !!friendsById[id];
      if (!isMe && !isFriend) continue;

      const inVenue = findContainingVenue(latestP);
      const ghost = isMe
        ? myGhostMode
        : (presenceGhostById[id] ?? !!friendProfilesById[id]?.ghost_mode);

      if (inVenue) {
        const latestFreshP = latestPresenceByUser.get(id);
        if (!latestFreshP) continue;
        const bucket = venueBuckets.get(inVenue.id) ?? {
          venue: inVenue,
          allCount: 0,
          visibleUserIds: [],
        };
        bucket.allCount += 1;
        if (isMe || !ghost) bucket.visibleUserIds.push(id);
        venueBuckets.set(inVenue.id, bucket);
        continue;
      }

      const p = isMe
        ? activePresenceByUser.get(id)
        : (activePresenceByUser.get(id) ?? latestKnownPresenceByUser.get(id));
      if (!p) continue;
      if (!isMe && ghost) continue;
      if (isGlobeView) continue;
      if (isLikelyMapFallbackPresence(p.lat, p.lng)) continue;

      const profile = isMe ? myProfile : friendProfilesById[id];
      const label =
        isMe
          ? "You"
          : profile?.display_name ||
            profile?.username ||
            usernamesById[id] ||
            "Friend";

      const markerEl = document.createElement("button");
      const markerSize = markerSizeForZoom(mapZoom);
      const isLiveNow = isPresenceLive(p.updated_at, now);
      markerEl.type = "button";
      markerEl.style.width = `${markerSize}px`;
      markerEl.style.height = `${markerSize}px`;
      markerEl.style.borderRadius = "999px";
      markerEl.style.border = "0";
      markerEl.style.padding = "0";
      markerEl.style.background = "transparent";
      markerEl.style.overflow = "visible";
      markerEl.style.boxShadow = isMe
        ? `0 0 0 ${Math.max(2, Math.round(markerSize * 0.14))}px rgba(122,60,255,0.2), 0 0 ${Math.max(8, Math.round(markerSize * 0.42))}px rgba(122,60,255,0.46)`
        : isFriend
          ? isLiveNow
            ? `0 0 0 ${Math.max(2, Math.round(markerSize * 0.14))}px rgba(34,197,94,0.3), 0 0 ${Math.max(8, Math.round(markerSize * 0.42))}px rgba(34,197,94,0.42)`
            : `0 0 0 ${Math.max(2, Math.round(markerSize * 0.14))}px rgba(148,163,184,0.52), 0 0 ${Math.max(6, Math.round(markerSize * 0.3))}px rgba(148,163,184,0.2)`
          : "none";
      markerEl.style.cursor = "pointer";
      markerEl.setAttribute("aria-label", `Open ${label} profile`);
      markerEl.style.position = "relative";

      markerEl.appendChild(
        buildAvatarElement(
          profile?.avatar_url,
          label,
          markerSize,
          Math.max(9, Math.round(markerSize * 0.26))
        )
      );

      if (!isMe && isFriend && isLiveNow) {
        const pulseRing = document.createElement("span");
        pulseRing.style.position = "absolute";
        pulseRing.style.inset = "0";
        pulseRing.style.borderRadius = "999px";
        pulseRing.style.border = `2px solid rgba(34,197,94,0.65)`;
        pulseRing.style.pointerEvents = "none";
        pulseRing.style.transformOrigin = "center";
        pulseRing.animate(
          [
            { transform: "scale(1)", opacity: 0.8 },
            { transform: "scale(1.22)", opacity: 0 },
          ],
          {
            duration: 1300,
            iterations: Number.POSITIVE_INFINITY,
            easing: "ease-out",
          }
        );
        markerEl.appendChild(pulseRing);
      }

      const markerVenueContext = findContainingVenue(p);
      if (!isMe && !isLiveNow && !markerVenueContext) {
        const lastSeenTag = document.createElement("div");
        lastSeenTag.textContent = formatLastSeen(p.updated_at);
        const dayText = "rgba(37, 24, 71, 0.95)";
        const nightText = "rgba(236, 229, 255, 0.96)";
        const dayShadow = "0 1px 1px rgba(255,255,255,0.75), 0 0 4px rgba(122,60,255,0.18)";
        const nightShadow = "0 1px 2px rgba(0,0,0,0.95), 0 0 5px rgba(155,126,255,0.35)";
        lastSeenTag.style.position = "absolute";
        lastSeenTag.style.left = "50%";
        lastSeenTag.style.bottom = `${-Math.max(11, Math.round(markerSize * 0.42))}px`;
        lastSeenTag.style.transform = "translateX(-50%)";
        lastSeenTag.style.whiteSpace = "nowrap";
        lastSeenTag.style.padding = "0";
        lastSeenTag.style.borderRadius = "0";
        lastSeenTag.style.fontFamily =
          "'SF Pro Display','Inter','Avenir Next','Segoe UI',system-ui,-apple-system,sans-serif";
        lastSeenTag.style.fontSize = "9px";
        lastSeenTag.style.fontWeight = "800";
        lastSeenTag.style.letterSpacing = "0.012em";
        lastSeenTag.style.color = mapDayMode ? dayText : nightText;
        lastSeenTag.style.background = "transparent";
        lastSeenTag.style.border = "0";
        lastSeenTag.style.lineHeight = "1.05";
        lastSeenTag.style.textShadow = mapDayMode ? dayShadow : nightShadow;
        lastSeenTag.style.pointerEvents = "none";
        markerEl.appendChild(lastSeenTag);
      }

      markerEl.onclick = (ev) => {
        ev.stopPropagation();
        if (isMe) {
          router.push("/profile");
          return;
        }
        openFriendProfile(id);
      };

      const [markerLng, markerLat] = markerOffsetPosition(p, id);
      const target: [number, number] = [markerLng, markerLat];
      presenceMarkerTargetRef.current.set(id, target);
      const prevS = presenceMarkerSmoothRef.current.get(id);
      const jump = prevS
        ? Math.hypot(target[0] - prevS.lng, target[1] - prevS.lat)
        : 0;
      const snap = !prevS || jump > PRESENCE_MARKER_SNAP_DEG;
      const startLng = snap ? target[0] : prevS!.lng;
      const startLat = snap ? target[1] : prevS!.lat;
      presenceMarkerSmoothRef.current.set(id, { lng: startLng, lat: startLat });

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([startLng, startLat])
        .addTo(m);
      presenceMarkers.current.set(id, marker);
      placedPresenceMarkerIds.add(id);
    }

    for (const uid of Array.from(presenceMarkerSmoothRef.current.keys())) {
      if (!placedPresenceMarkerIds.has(uid)) {
        presenceMarkerSmoothRef.current.delete(uid);
        presenceMarkerTargetRef.current.delete(uid);
      }
    }

    if (isGlobeView) return;

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
        const now = Date.now();
        tourIdleSinceRef.current = now;
        setLastPageInteractionAt(now);
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
    presenceGhostById,
    usernamesById,
    meId,
    myGhostMode,
    myProfile,
    hiddenIds,
    router,
    openFriendProfile,
    mapReady,
    venues,
    mapZoom,
    mapDayMode,
  ]);

  useEffect(() => {
    if (!mapReady) return;
    let raf = 0;
    const tick = () => {
      for (const [id, marker] of presenceMarkers.current) {
        const t = presenceMarkerTargetRef.current.get(id);
        if (!t) continue;
        let s = presenceMarkerSmoothRef.current.get(id);
        if (!s) {
          s = { lng: t[0], lat: t[1] };
          presenceMarkerSmoothRef.current.set(id, s);
        }
        const dLng = t[0] - s.lng;
        const dLat = t[1] - s.lat;
        const dist = Math.hypot(dLng, dLat);
        if (dist < 1e-7) {
          if (s.lng !== t[0] || s.lat !== t[1]) {
            s.lng = t[0];
            s.lat = t[1];
            marker.setLngLat([s.lng, s.lat]);
          }
          continue;
        }
        if (dist > PRESENCE_MARKER_SNAP_DEG) {
          s.lng = t[0];
          s.lat = t[1];
        } else {
          const a = PRESENCE_MARKER_SMOOTH_ALPHA;
          s.lng += dLng * a;
          s.lat += dLat * a;
        }
        marker.setLngLat([s.lng, s.lat]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapReady]);

  const rightSidebarFriends = useMemo(() => {
    const now = Date.now();
    const ids = Object.keys(friendsById);
    return ids
      .map((id) => {
        const profile = friendProfilesById[id];
        const pres = presence.find((p) => p.user_id === id);
        const hiddenByGhost = !!profile?.ghost_mode;
        const lastSeen = pres?.updated_at ?? null;
        const online = !!lastSeen && isPresenceLive(lastSeen, now);
        return { id, profile, online, lastSeen, hiddenByGhost };
      })
      .filter((f) => !f.hiddenByGhost)
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        const ta = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const tb = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return tb - ta;
      });
  }, [friendsById, friendProfilesById, presence]);

  const focusFriendOnMap = useCallback(
    (friendId: string) => {
      const now = Date.now();
      tourIdleSinceRef.current = now;
      lastAutoTourHopAtRef.current = 0;
      const until = now + AUTO_TOUR_PAUSE_MS;
      autoTourPausedUntilRef.current = until;
      setLastPageInteractionAt(now);
      setAutoTourPausedUntil(until);

      const pres = presence
        .filter((p) => p.user_id === friendId)
        .reduce<PresenceRow | null>((best, p) => {
          if (!best) return p;
          return new Date(p.updated_at).getTime() > new Date(best.updated_at).getTime() ? p : best;
        }, null);

      const m = map.current;
      if (!m || !mapReady) return;

      if (pres?.venue_id) {
        const v = venues.find((ven) => ven.id === pres.venue_id);
        if (v && isValidCoordinatePair(v.lat, v.lng)) {
          setPanelMode("categories");
          setSelectedVenueId(v.id);
          armProgrammaticCamera(1100);
          m.easeTo({
            center: [v.lng, v.lat],
            zoom: Math.max(m.getZoom(), 15.8),
            duration: 950,
            essential: true,
          });
          return;
        }
      }
      if (pres && isValidCoordinatePair(pres.lat, pres.lng)) {
        setPanelMode("categories");
        setSelectedVenueId(null);
        armProgrammaticCamera(1100);
        m.easeTo({
          center: [pres.lng, pres.lat],
          zoom: Math.max(m.getZoom(), 15.5),
          duration: 950,
          essential: true,
        });
      }
    },
    [mapReady, presence, venues]
  );

  const goToPrevCheckpoint = () => {
    if (!checkpoints.length) return;
    const now = Date.now();
    lastArrowPressAtRef.current = now;
    setLastArrowPressAt(now);
    tourIdleSinceRef.current = now;
    lastAutoTourHopAtRef.current = 0;
    const until = now + AUTO_TOUR_PAUSE_MS;
    autoTourPausedUntilRef.current = until;
    setLastPageInteractionAt(now);
    setAutoTourPausedUntil(until);
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((prev) => (prev - 1 + checkpoints.length) % checkpoints.length);
  };

  const goToNextCheckpoint = () => {
    if (!checkpoints.length) return;
    const now = Date.now();
    lastArrowPressAtRef.current = now;
    setLastArrowPressAt(now);
    tourIdleSinceRef.current = now;
    lastAutoTourHopAtRef.current = 0;
    const until = now + AUTO_TOUR_PAUSE_MS;
    autoTourPausedUntilRef.current = until;
    setLastPageInteractionAt(now);
    setAutoTourPausedUntil(until);
    setCheckpointMotionEnabled(true);
    setCheckpointIndex((prev) => (prev + 1) % checkpoints.length);
  };

  const ghostToggle =
    meId ? (
      <button
        type="button"
        onClick={async () => {
          const now = Date.now();
          tourIdleSinceRef.current = now;
          lastAutoTourHopAtRef.current = 0;
          const until = now + AUTO_TOUR_PAUSE_MS;
          autoTourPausedUntilRef.current = until;
          setLastPageInteractionAt(now);
          setAutoTourPausedUntil(until);
          const next = !myGhostMode;
          setMyGhostMode(next);
          await supabase.from("profiles").update({ ghost_mode: next }).eq("id", meId);
        }}
        className={`self-end rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition ${
          myGhostMode
            ? "border-accent-violet/55 bg-accent-violet/30 text-white"
            : "border-white/15 bg-black/55 text-white/85"
        }`}
      >
        {myGhostMode ? "Ghost on" : "Ghost off"}
      </button>
    ) : null;

    return (
    <div className="relative min-h-[100svh] h-[100dvh] w-screen bg-black">
      {!mapReady ? (
        <div className="pointer-events-none absolute inset-0 z-[100]" aria-hidden>
          <MapPageSkeleton />
        </div>
      ) : null}
      <div ref={mapRef} className="h-full w-full" />
      {locateWormhole ? (
        <div
          className="pointer-events-none absolute inset-0 z-[15] overflow-hidden"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(122,60,255,0.42)_0%,rgba(9,8,13,0.2)_45%,transparent_72%)]" />
          <div className="absolute inset-0 backdrop-blur-[2.5px]" />
          <div
            className="absolute left-1/2 top-1/2 h-[min(140vw,620px)] w-[min(140vw,620px)] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full opacity-[0.14]"
            style={{
              background:
                "conic-gradient(from 120deg, rgba(255,255,255,0.55), transparent 40%, rgba(122,60,255,0.35), transparent 75%)",
              animationDuration: "1.4s",
            }}
          />
        </div>
      ) : null}
      <div className="absolute left-1/2 z-20 flex w-[min(94vw,420px)] -translate-x-1/2 flex-col items-stretch gap-2 top-[calc(env(safe-area-inset-top,0px)+30px)]">
        <aside className="rounded-2xl border border-white/15 bg-black/60 p-2 backdrop-blur-xl">
          <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
            {categoryFilters.map((filter) => {
              const Icon = filter.icon;
              const active = activeCategory === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveCategory(filter.key)}
                  className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
                  style={{
                    borderColor: active ? `${filter.accent}99` : "rgba(255,255,255,0.08)",
                    background: active ? `${filter.accent}28` : "rgba(255,255,255,0.015)",
                    color: active ? filter.accent : "rgba(255,255,255,0.88)",
                  }}
                  aria-label={`Filter by ${filter.label}`}
                >
                  <div className="flex items-center gap-1">
                    <Icon size={11} strokeWidth={active ? 2.25 : 1.85} className="shrink-0" />
                    <span>{filter.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={runLocateCycle}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur transition"
            aria-label="Center on this venue when open, or your map location; second tap zooms out"
          >
            <LocateFixed size={13} strokeWidth={2.2} className="shrink-0 opacity-85" />
            Locate
          </button>

          <button
            type="button"
            onClick={() => setPanelMode((prev) => (prev === "friends" ? "categories" : "friends"))}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition ${
              panelMode === "friends"
                ? "border-accent-violet/55 bg-accent-violet/30 text-white shadow-[0_0_18px_rgba(122,60,255,0.44)]"
                : "border-white/15 bg-black/55 text-white/85"
            }`}
            aria-expanded={panelMode === "friends"}
            aria-label={panelMode === "friends" ? "Hide friends list" : "Show friends list"}
          >
            Friends
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`shrink-0 opacity-80 transition-transform duration-200 ${panelMode === "friends" ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>

        {panelMode === "friends" ? (
          <aside className="w-[112px] min-h-[160px] max-h-[min(42vh,280px)] self-end overflow-y-auto rounded-xl border border-accent-violet/25 bg-[#070c16ee] p-1.5 backdrop-blur-xl">
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
                  type="button"
                  onClick={() => focusFriendOnMap(f.id)}
                  className="group relative flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-1.5 py-1"
                  aria-label={`Show ${label} on map`}
                >
                  <div className={`relative rounded-full ${f.online ? "shadow-[0_0_18px_rgba(59,130,246,0.45)]" : ""}`}>
                    {f.profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.profile.avatar_url}
                        alt={label}
                        className="h-9 w-9 rounded-full border border-white/20 object-cover"
                      />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-gradient-to-br from-[#9c6bff] via-[#7a3cff] to-[#5a26d9]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[62%] w-[62%] text-white/95"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <circle cx="12" cy="8.25" r="3.5" fill="currentColor" />
                          <path
                            d="M5 19.25C5 15.9363 7.68629 13.25 11 13.25H13C16.3137 13.25 19 15.9363 19 19.25V20.25H5V19.25Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                    )}
                    {f.online ? (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-sky-400" />
                    ) : null}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[10px] font-semibold text-white/90">
                      {label}
                    </p>
                    <p className="truncate text-[9px] text-white/55">
                      {f.online ? "Online now" : f.lastSeen ? formatLastSeen(f.lastSeen) : "Nearby"}
                    </p>
                  </div>
                </button>
              );
            })}
            {rightSidebarFriends.length === 0 ? (
              <div className="pt-1 text-center text-[11px] text-white/45">No crowd yet</div>
            ) : null}
          </div>
        </aside>
        ) : null}
        {ghostToggle}
      </div>
      {!selectedVenue ? (
      <div
        className="absolute left-1/2 z-20 flex w-[min(92vw,460px)] -translate-x-1/2 items-center justify-between gap-2 rounded-full border border-white/15 bg-black/60 px-2.5 py-1.5 backdrop-blur"
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MAP_NAV_CLEARANCE_PX}px)`,
        }}
      >
        <button
          type="button"
          onClick={goToPrevCheckpoint}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white active:bg-white/10"
          aria-label="Previous checkpoint"
        >
          <ChevronLeft size={28} strokeWidth={2.5} className="text-white/95" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!activeCheckpoint) return;
            const now = Date.now();
            tourIdleSinceRef.current = now;
            lastAutoTourHopAtRef.current = 0;
            const until = now + AUTO_TOUR_PAUSE_MS;
            autoTourPausedUntilRef.current = until;
            setLastPageInteractionAt(now);
            setAutoTourPausedUntil(until);
            setSelectedVenueId(activeCheckpoint.id);
          }}
          className="flex-1 truncate px-2 text-center text-sm font-medium text-white/90"
          aria-label="Open active checkpoint"
        >
          {activeCheckpoint ? (
            currentUserCoords
              ? `${activeCheckpoint.name} • ${formatMilesFromMeters(activeCheckpoint.distanceFromYou)}`
              : `${activeCheckpoint.name} • locating...`
          ) : "No crowd yet"}
        </button>
        <button
          type="button"
          onClick={goToNextCheckpoint}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white active:bg-white/10"
          aria-label="Next checkpoint"
        >
          <ChevronRight size={28} strokeWidth={2.5} className="text-white/95" aria-hidden />
        </button>
      </div>
      ) : null}
      {selectedVenue ? (
        <section
          className="absolute inset-x-0 bottom-0 z-30 h-[74svh] max-h-[760px] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-[#06070ddd] text-white shadow-[0_-18px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl md:h-[70svh]"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-2.5">
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-tight">{selectedVenue.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
                  {selectedVenue.category ? (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                      {selectedVenue.category}
                    </span>
                  ) : null}
                  {currentUserCoords ? (
                    <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-2 py-1 text-sky-100/90">
                      {formatMilesFromMeters(
                        distanceMeters(
                          currentUserCoords.lat,
                          currentUserCoords.lng,
                          selectedVenue.lat,
                          selectedVenue.lng
                        )
                      )}{" "}
                      away
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-white/75">
                      locating...
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const lat = selectedVenue.lat;
                    const lng = selectedVenue.lng;
                    const destination = `${lat},${lng}`;
                    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
                    const isIOS = /iPad|iPhone|iPod/.test(ua);
                    const href = isIOS
                      ? `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
                      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
                    window.open(href, "_blank");
                  }}
                  className="h-8 rounded-full border border-white/20 bg-white/5 px-3 text-[11px] font-semibold text-white/90"
                >
                  Open directions
                </button>
                <button
                  type="button"
                  onClick={closeVenueCard}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/5 text-white/85"
                  aria-label="Close venue panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Venue
                </div>
                {selectedVenue.image_url || selectedVenue.photo_url || selectedVenue.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedVenue.image_url || selectedVenue.photo_url || selectedVenue.cover_image_url || ""}
                    alt={selectedVenue.name}
                    className="h-[140px] w-full rounded-[12px] border border-white/10 object-cover"
                  />
                ) : (
                  <div className="grid h-[140px] place-items-center rounded-[12px] border border-white/10 bg-gradient-to-br from-accent-violet/16 via-accent-violet/10 to-teal-400/10 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white/85">{selectedVenue.name}</p>
                      <p className="text-xs text-white/50">Venue photo coming soon</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="min-h-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5">
                <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-pink-300/20 bg-pink-500/10 px-3 py-2">
                    <p className="text-xs text-white/60">Inside</p>
                    <p className="font-semibold">{selectedVenuePeople.insideAll.length}</p>
                    <p className="text-[11px] text-white/50">
                      {selectedVenuePeople.insideFriends.length}{" "}
                      {selectedVenuePeople.insideFriends.length === 1 ? "friend" : "friends"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-teal-300/20 bg-teal-500/10 px-3 py-2">
                    <p className="text-xs text-white/60">Nearby</p>
                    <p className="font-semibold">{selectedVenuePeople.nearbyAll.length}</p>
                    <p className="text-[11px] text-white/50">
                      {selectedVenuePeople.nearbyFriends.length}{" "}
                      {selectedVenuePeople.nearbyFriends.length === 1 ? "friend" : "friends"}
                    </p>
                  </div>
                </div>
                <div
                  className="space-y-3 pr-1"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="border-b border-white/10 pb-3">
                    <h3 className="mb-1.5 text-xs font-semibold text-white/85">Friends Inside</h3>
                    {selectedVenuePeople.insideFriends.length ? (
                      <div className="space-y-2">
                        <div className="flex items-center">
                          {selectedVenuePeople.insideFriends.slice(0, 5).map((friend, index) => {
                            const profile = friendProfilesById[friend.user_id];
                            return (
                              <button
                                key={`${friend.user_id}-inside-avatar`}
                                type="button"
                                onClick={() => focusFriendOnMap(friend.user_id)}
                                className="relative rounded-full border-0 bg-transparent p-0"
                                style={{ marginLeft: index === 0 ? 0 : -8, zIndex: 5 - index }}
                                title={friend.name}
                                aria-label={`Show ${friend.name} on map`}
                              >
                                {profile?.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={profile.avatar_url}
                                    alt=""
                                    className="h-9 w-9 rounded-full border border-white/25 object-cover"
                                  />
                                ) : (
                                  <div className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-[10px] font-semibold">
                                    {initialsFromName(friend.name)}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {selectedVenuePeople.insideFriends.slice(0, 12).map((friend) => (
                          <button
                            key={`${friend.user_id}-inside-label`}
                            type="button"
                            onClick={() => focusFriendOnMap(friend.user_id)}
                            className="block w-full truncate rounded-lg py-1 text-left text-xs text-white/80 hover:bg-white/[0.06]"
                          >
                            {friend.name}
                            {friend.isRecentPresence ? (
                              <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
                                Recently
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50">No friends here yet. Be the first there.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold text-white/85">Friends Nearby</h3>
                    {selectedVenuePeople.nearbyFriends.length ? (
                      <div className="space-y-1.5">
                        {selectedVenuePeople.nearbyFriends.map((friend) => (
                          <button
                            key={`${friend.user_id}-nearby`}
                            type="button"
                            onClick={() => focusFriendOnMap(friend.user_id)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-xs hover:bg-white/[0.05]"
                          >
                            <span className="block truncate">
                              {friend.name}
                              {friend.isRecentPresence ? (
                                <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
                                  Recently
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50">Quiet right now</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // TODO: when venue-scoped story viewer is available, open it directly using selectedVenue.id.
                    router.push(`/venue-activity?venueId=${encodeURIComponent(selectedVenue.id)}`);
                    setActivityPlaceholderOpen(true);
                  }}
                  className="mt-3 w-full rounded-xl border border-accent-violet/35 bg-accent-violet/25 px-3 py-2 text-left text-sm font-semibold text-white"
                >
                  View Activity →
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {activityPlaceholderOpen ? (
        <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] z-40 rounded-2xl border border-accent-violet/35 bg-[#120a1ccc] p-3 text-xs text-white backdrop-blur">
          Activity viewer handoff sent. TODO: wire this state to a venue-filtered stories modal when map-local viewer lands.
          <button
            type="button"
            onClick={() => setActivityPlaceholderOpen(false)}
            className="ml-2 underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-[100dvh] w-screen bg-black" aria-hidden />}>
        <MapPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
