"use client";

import mapboxgl from "mapbox-gl";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UtensilsCrossed,
  Sparkles,
  GraduationCap,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LocateFixed,
  Map as MapsAppIcon,
  Navigation,
} from "lucide-react";
import {
  DISTRICT_FLOW_CORE_LAYER_ID,
  DISTRICT_FLOW_GLOW_LAYER_ID,
  DISTRICT_FLOW_SOURCE_ID,
  applyDistrictFlowFromPresence,
  buildDistrictFlowFeatureCollection,
  decayDistrictFlowState,
  type DistrictFlowState,
} from "@/lib/districtFlowTrails";
import {
  LIVE_WINDOW_MS,
  getPresenceFreshness,
  isFriendOnlineNow,
  isLikelyMapFallbackPresence,
  isPresenceLive,
  isPresenceLiveForHeat,
  isValidCoordinatePair,
  MAP_FALLBACK_CENTER_LAT,
  MAP_FALLBACK_CENTER_LNG,
} from "@/lib/presence";
import { isWebPresenceWriteRetired } from "@intencity/shared";
import { formatRelativeTime } from "@/lib/time";
import { syncUserPresenceWithVenuesFromCoords, type VenueForPresenceSync } from "@/lib/userPresenceVenueSync";
import { acceptedFriendIdsExcludingBlocks } from "@/lib/pairBlockStatus";
import { resolveVenueContextLine } from "@/lib/venueContextCopy";
import { formatVenueCategoryLabel } from "@/lib/venueCategoryLabel";
import {
  type VenueCategoryAccentKey,
  resolveVenueCategoryAccentKey,
  venueCategoryAccentHex,
  CAMPUS_VENUE_NAME_SUBSTRINGS,
} from "@/lib/venueCategoryAccent";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthRouteTransition } from "@/components/AuthRouteTransition";
import MapPageSkeleton from "@/components/skeletons/MapPageSkeleton";
import { fogPropsForDayMode } from "@/lib/mapAtmosphere";
import {
  coalesceOverlappingVenueActivityFeatures,
  venueHeatColorStepExpression,
  venueHeatHexFromActivity,
  venueHeatmapColorExpression,
} from "@intencity/shared";
// Dev venue radii — off by default for MVP (enable locally when debugging zones)
const SHOW_DEV_RADII = false;

/** If Mapbox never fires `load` (bad token, URL allowlist, blocked tiles on LAN IP), still unblock splash/UI. */
const MAP_LOAD_FAILSAFE_MS = 12_000;

/** Friend/me avatar pins: ease toward each new polled position (no extra API traffic). */
const PRESENCE_MARKER_SMOOTH_ALPHA = 0.18;
/** Snap instead of sliding when the jump is huge (teleport, fresh session). ~1.3km at mid-lat. */
const PRESENCE_MARKER_SNAP_DEG = 0.012;

const MAP_STYLE_DAY = "mapbox://styles/mapbox/light-v11";
const MAP_STYLE_NIGHT = "mapbox://styles/mapbox/dark-v11";
const MAP_BRAND_TINT_LAYER = "map-brand-tone-overlay";

/** Discrete venue hit targets — exclude heat so diffuse cloud clicks still dismiss the sheet. */
const MAP_VENUE_CLOSE_HIT_LAYERS = ["venues-anchor", "venue-core", "venue-glow", "venues-name-labels"] as const;

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

function heatHexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/i.test(h)) {
    return `rgba(42, 42, 42, ${alpha})`;
  }
  const v = parseInt(h, 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Heat-tinted ring + bloom so the pill reads lively without a flat color wash. Stronger on light map so it mirrors night visibility. */
function checkpointBarHeatShadowStyle(activity: number, dayMode: boolean): { boxShadow: string } {
  const heat = venueHeatHexFromActivity(activity);
  const edge = dayMode ? 0.34 : 0.24;
  const glow = dayMode ? 0.44 : 0.32;
  const drop = dayMode ? 0.22 : 0.14;
  return {
    boxShadow: `0 0 0 1px ${heatHexToRgba(heat, edge)}, 0 0 22px ${heatHexToRgba(heat, glow)}, 0 12px 40px ${heatHexToRgba(heat, drop)}`,
  };
}

/** Matches venue heat steps: 9 High → 16 Very High+. Pulse starts at High tier. */
const CHECKPOINT_RING_PULSE_SOFT_MIN = 9;
const CHECKPOINT_RING_PULSE_STRONG_MIN = 16;

function checkpointBarHeatPulseTier(activity: number): "off" | "soft" | "strong" {
  const n = Math.max(0, Math.round(Number.isFinite(activity) ? activity : 0));
  if (n >= CHECKPOINT_RING_PULSE_STRONG_MIN) return "strong";
  if (n >= CHECKPOINT_RING_PULSE_SOFT_MIN) return "soft";
  return "off";
}

/** Extra bloom behind controls; opacity is animated in CSS (see `ah-checkpoint-ring-pulse-*`). Boost on day map. */
function checkpointBarPulseOverlayStyle(activity: number, dayMode: boolean): { boxShadow: string } | undefined {
  const tier = checkpointBarHeatPulseTier(activity);
  if (tier === "off") return undefined;
  const heat = venueHeatHexFromActivity(activity);
  if (tier === "strong") {
    return {
      boxShadow: dayMode
        ? `0 0 26px ${heatHexToRgba(heat, 0.58)}, 0 0 54px ${heatHexToRgba(heat, 0.36)}`
        : `0 0 14px ${heatHexToRgba(heat, 0.34)}, 0 0 32px ${heatHexToRgba(heat, 0.2)}`,
    };
  }
  return {
    boxShadow: dayMode
      ? `0 0 20px ${heatHexToRgba(heat, 0.46)}, 0 0 42px ${heatHexToRgba(heat, 0.28)}`
      : `0 0 12px ${heatHexToRgba(heat, 0.22)}, 0 0 26px ${heatHexToRgba(heat, 0.12)}`,
  };
}

/** Venue bottom sheet: neutral depth + heat rim so day mode matches checkpoint energy. */
function venueSheetStackShadowStyle(activity: number, dayMode: boolean): { boxShadow: string } {
  const heat = venueHeatHexFromActivity(activity);
  if (dayMode) {
    return {
      boxShadow: [
        "0 -36px 100px rgba(15,20,29,0.1)",
        "0 -4px 52px rgba(59,102,255,0.07)",
        `0 -14px 60px ${heatHexToRgba(heat, 0.24)}`,
        `0 -2px 44px ${heatHexToRgba(heat, 0.16)}`,
      ].join(", "),
    };
  }
  return {
    boxShadow: [
      "0 -44px 120px rgba(0,0,0,0.72)",
      `0 -16px 64px ${heatHexToRgba(heat, 0.34)}`,
      `0 -4px 56px ${heatHexToRgba(heat, 0.2)}`,
      `0 0 0 1px ${heatHexToRgba(heat, 0.12)}`,
    ].join(", "),
  };
}

/** Top-edge pulse ring on venue sheet — heat keyed like map layers (not fixed violet). */
function venueSheetInnerRimStyle(activity: number, dayMode: boolean): { borderColor: string; boxShadow: string } {
  const heat = venueHeatHexFromActivity(activity);
  return {
    borderColor: heatHexToRgba(heat, dayMode ? 0.34 : 0.3),
    boxShadow: dayMode
      ? `0 -16px 52px ${heatHexToRgba(heat, 0.22)}, 0 0 0 1px ${heatHexToRgba(heat, 0.12)}, 0 0 48px ${heatHexToRgba(heat, 0.16)}`
      : `0 -18px 58px ${heatHexToRgba(heat, 0.3)}, 0 0 0 1px ${heatHexToRgba(heat, 0.14)}, 0 0 56px ${heatHexToRgba(heat, 0.22)}`,
  };
}

/** Local device clock: light map 7:00–17:59, night from 18:00 until before 7:00. */
function localHourIsMapDaytime(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 7 && h < 18;
}

function mapStyleUrlForDayMode(day: boolean): string {
  return day ? MAP_STYLE_DAY : MAP_STYLE_NIGHT;
}

function applyMapAtmosphereForMode(m: mapboxgl.Map, dayMode: boolean, zoom = m.getZoom()) {
  m.setFog(fogPropsForDayMode(dayMode, zoom));
}

function applyBrandedBasemapTheme(m: mapboxgl.Map, dayMode: boolean) {
  /** Night: pull roads + labels closer to land so venue / heat overlays stay the focal plane. */
  const roadColor = dayMode ? "#C5CBD6" : "#2a3344";
  const roadOutlineColor = dayMode ? "#B4BCC8" : "#232c3a";
  const labelColor = dayMode ? "#4A5568" : "#8896a8";
  const mutedLabelColor = dayMode ? "#718096" : "#6a7585";
  const waterColor = dayMode ? "#A8BED9" : "#0A1624";
  const parkColor = dayMode ? "#B4C9B0" : "#1A2520";
  const landColor = dayMode ? "#F1F3F6" : "#0f141d";
  const bgColor = dayMode ? "#F7F8FA" : "#0b1017";

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
      safeSetPaint(layer.id, "text-halo-color", dayMode ? "rgba(247,248,250,0.9)" : "rgba(11,16,23,0.88)");
      safeSetPaint(layer.id, "text-halo-width", dayMode ? 0.8 : 0.55);
    }
  }

  // Subtle brand-tint air — keeps heat / venue activity layers visually dominant (do not overpower basemap).
  if (m.getLayer(MAP_BRAND_TINT_LAYER)) {
    safeSetPaint(MAP_BRAND_TINT_LAYER, "background-color", "#3B66FF");
    safeSetPaint(MAP_BRAND_TINT_LAYER, "background-opacity", dayMode ? 0.028 : 0.032);
  } else {
    try {
      m.addLayer({
        id: MAP_BRAND_TINT_LAYER,
        type: "background",
        paint: {
          "background-color": "#3B66FF",
          "background-opacity": dayMode ? 0.028 : 0.032,
        },
      });
    } catch {
      /* style may still be settling */
    }
  }

  applyBasemapMinimalDetail(m, dayMode);
}

/**
 * Calm Mapbox Streets so custom venue pins read as the hero: fewer strokes + no 3D extrusions.
 * Safe across style revisions — unknown layer ids are skipped.
 */
function applyBasemapMinimalDetail(m: mapboxgl.Map, dayMode: boolean) {
  const style = m.getStyle();
  if (!style?.layers) return;

  const safeHide = (layerId: string) => {
    try {
      if (m.getLayer(layerId)) m.setLayoutProperty(layerId, "visibility", "none");
    } catch {
      /* layout prop missing on some layer types */
    }
  };

  const noiseLineId = (id: string) => {
    const l = id.toLowerCase();
    if (!l.includes("road-") && !l.includes("bridge-") && !l.includes("tunnel-")) return false;
    return /\b(path|pedestrian|service|track|steps|minor|construction)\b/.test(l);
  };

  const transitLineId = (id: string) => {
    const l = id.toLowerCase();
    return (
      l.startsWith("transit") ||
      /\b(rail|subway|tram|monorail|funicular|ferry)\b/.test(l)
    );
  };

  for (const layer of style.layers) {
    const { id, type } = layer;
    const lower = id.toLowerCase();

    if (type === "fill-extrusion" && lower.includes("building")) {
      safeHide(id);
      continue;
    }

    if (type === "line") {
      if (transitLineId(lower) || noiseLineId(lower)) {
        safeHide(id);
      }
      continue;
    }

    if (!dayMode && type === "symbol") {
      if (lower.startsWith("poi-") && !lower.includes("road")) {
        safeHide(id);
        continue;
      }
      if (lower.includes("transit") && lower.includes("label")) {
        safeHide(id);
      }
    }
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
  context_copy?: unknown;
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

function drawCategoryGlyph(
  ctx: CanvasRenderingContext2D,
  key: VenueCategoryAccentKey,
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

function createCategoryMarkerImage(key: VenueCategoryAccentKey = "all") {
  const size = 152;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const glyphCy = size / 2;

  const fill = venueCategoryAccentHex(key);
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
  const { end: endAuthRouteTransition } = useAuthRouteTransition();

  const mapRef = useRef<HTMLDivElement | null>(null);
  /** Portals checkpoint UI to `document.body` so WebKit does not composite it under the Mapbox GL canvas (see globals `#ah-bottom-nav-root`). */
  const [checkpointPortalEl, setCheckpointPortalEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    setCheckpointPortalEl(document.body);
  }, []);

  const [storyCameraOrComposerOpen, setStoryCameraOrComposerOpen] = useState(false);
  useEffect(() => {
    const onVis = (e: Event) => {
      const d = (e as CustomEvent<{ open?: boolean }>).detail;
      setStoryCameraOrComposerOpen(!!d?.open);
    };
    window.addEventListener("ah-story-camera-visibility", onVis as EventListener);
    return () => window.removeEventListener("ah-story-camera-visibility", onVis as EventListener);
  }, []);

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
      endAuthRouteTransition();
    }
    return () => {
      w.__ahMapReady = false;
    };
  }, [mapReady, endAuthRouteTransition]);

  /** Same rationale as hub: dismiss post-login overlay if Mapbox stalls or user deep-links to map. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      endAuthRouteTransition();
    }, MAP_LOAD_FAILSAFE_MS + 2500);
    return () => window.clearTimeout(id);
  }, [endAuthRouteTransition]);

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
const [presenceUiTick, setPresenceUiTick] = useState(0);
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
/** Aggregate venue→venue flow trails (no per-user geometry exposed). */
const districtFlowStateRef = useRef<DistrictFlowState>({
  anchorByUser: new Map(),
  edges: new Map(),
});
/** Pull-down / wheel dismiss on venue sheet grab bar. */
const sheetDragRef = useRef<{ y: number; pointerId: number } | null>(null);
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

const MAP_NAV_CLEARANCE_PX = 124;
type CategoryKey = "all" | "nightlife" | "food" | "events" | "campus";
type MapPanelMode = "categories" | "friends";
const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
const [panelMode, setPanelMode] = useState<MapPanelMode>("categories");
const [mapZoom, setMapZoom] = useState(14);

/** Category accent palette (brand-aligned). */
/** Filter-chip accent for “All” (not the default venue glyph color on markers). */
const MAP_PIN_ALL = "#3B66FF";
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
const selectedVenueContextLine = useMemo(
  () => (selectedVenue ? resolveVenueContextLine(new Date(), selectedVenue.context_copy) : null),
  [selectedVenue]
);
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
  const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);
  const isFriend = p.user_id in friendsById;

  // ✅ FILTER LOGIC (THIS IS THE FIX)
  if (!isFriend && d > venue.outer_radius_m) continue;

  const badgeOnline = isFriendOnlineNow(p.updated_at, now);
  const isRecentPresence =
    isFriend && !badgeOnline && (freshness === "live" || freshness === "recent");

    const item: VenuePerson = {
      user_id: p.user_id,
      isFriend,
      name: isFriend ? usernamesById[p.user_id] ?? "Friend" : "Someone",
      isRecentPresence,
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
  let ids: string[];
  try {
    ids = await acceptedFriendIdsExcludingBlocks(supabase, meId);
  } catch (e) {
    console.error("Map: friends load error:", e);
    return;
  }

  const map: Record<string, true> = {};
  for (const id of ids) map[id] = true;

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
  window.addEventListener("friend-removed", handler);
  return () => {
    window.removeEventListener("friends-updated", handler);
    window.removeEventListener("friend-removed", handler);
  };
}, [meId]);

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
    if (typeof window !== "undefined" && !window.isSecureContext) {
      console.warn(
        "[map] Geolocation needs a secure context (HTTPS or http://localhost). http://<LAN-IP> blocks location — use HTTPS, localhost, or a tunnel."
      );
    }
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
    attributionControl: false,
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

  let loadFailsafeId: number | null = window.setTimeout(() => {
    loadFailsafeId = null;
    console.warn(
      "[map] Mapbox load timed out — check NEXT_PUBLIC_MAPBOX_TOKEN and Mapbox URL restrictions for this origin (e.g. http://10.0.0.34:3000)."
    );
    setMapReady(true);
  }, MAP_LOAD_FAILSAFE_MS);

  const clearLoadFailsafe = () => {
    if (loadFailsafeId !== null) {
      window.clearTimeout(loadFailsafeId);
      loadFailsafeId = null;
    }
  };

  m.on("error", (e) => {
    console.warn("[map] Mapbox error:", e);
    clearLoadFailsafe();
    setMapReady(true);
  });

  m.on("load", () => {
    clearLoadFailsafe();
    applyMapAtmosphereForMode(m, initialDay, m.getZoom());
    applyBrandedBasemapTheme(m, initialDay);
    setMapReady(true);
    requestAnimationFrame(() => {
      try {
        m.resize();
      } catch {
        /* ignore */
      }
    });
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
  m.on("zoom", () => setMapZoom(m.getZoom()));
  m.on("zoomend", () => setMapZoom(m.getZoom()));

  return () => {
    clearLoadFailsafe();
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
    applyMapAtmosphereForMode(m, mapDayMode, mapZoom);
  }, [mapReady, mapDayMode, mapZoom]);

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
      applyMapAtmosphereForMode(m, targetDay, m.getZoom());
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

useEffect(() => {
  const id = window.setInterval(() => setPresenceUiTick((t) => t + 1), 15_000);
  return () => clearInterval(id);
}, []);

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

const runLocateCycle = useCallback(() => {
  const m = map.current;
  if (!m) return;

  const centerTo = (coords: { lng: number; lat: number }) => {
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
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}, [selectedVenue, meId, venues, presence]);


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
  if (!isPresenceLiveForHeat(p.updated_at, now)) continue;

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
}, [selectedVenue, presence, hiddenIds, meId, friendsById, usernamesById, venues, presenceGhostById, presenceUiTick]);

const selectedVenueActivity = useMemo(() => {
  if (!selectedVenue) return 0;
  const { redTotal, greenTotal } = getCountsForVenue(
    selectedVenue.id,
    presence,
    friendsById,
    venues,
    meId
  );
  return (redTotal ?? 0) + (greenTotal ?? 0);
}, [selectedVenue, presence, friendsById, venues, meId]);

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
      pitch: 40,
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
  const filteredVenuesFlowRef = useRef<Venue[]>([]);
  filteredVenuesFlowRef.current = filteredVenues;

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
      DISTRICT_FLOW_CORE_LAYER_ID,
      DISTRICT_FLOW_GLOW_LAYER_ID,
      VENUE_GLOW_LAYER,
      VENUE_CORE_LAYER,
      VENUE_ANCHOR_LAYER,
      VENUE_NAME_LABEL_LAYER,
    ];
    const legacySourceIds = [
      "venues-cluster-source",
      "presence-heat-source",
      VENUE_ACTIVITY_SOURCE,
      DISTRICT_FLOW_SOURCE_ID,
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

    m.addSource(DISTRICT_FLOW_SOURCE_ID, {
      type: "geojson",
      data: emptyFc as any,
    });

    const markerImageEntries: Array<[string, VenueCategoryAccentKey]> = [
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
        "heatmap-weight": 0,
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
        "heatmap-color": venueHeatmapColorExpression() as mapboxgl.Expression,
      },
    });

    // Ambient inter-venue “currents” — aggregate social graph movement only (curved, short-lived).
    m.addLayer(
      {
        id: DISTRICT_FLOW_GLOW_LAYER_ID,
        type: "line",
        source: DISTRICT_FLOW_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            3.2,
            11,
            6.2,
            13.5,
            8.8,
          ],
          "line-blur": 5,
          "line-opacity": [
            "*",
            ["coalesce", ["get", "pulse"], 0],
            [
              "interpolate",
              ["linear"],
              ["zoom"],
              8.4,
              0,
              9.6,
              0.34,
              12.2,
              0.48,
              13.7,
              0.38,
              14.2,
              0,
            ],
          ],
          "line-color": "rgba(99, 102, 241, 0.5)",
          "line-dasharray": [0.22, 3.1],
        },
      },
      VENUE_GLOW_LAYER
    );

    m.addLayer(
      {
        id: DISTRICT_FLOW_CORE_LAYER_ID,
        type: "line",
        source: DISTRICT_FLOW_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.65,
            12,
            1.15,
            13.5,
            1.35,
          ],
          "line-blur": 1.1,
          "line-opacity": [
            "*",
            ["coalesce", ["get", "pulse"], 0],
            [
              "interpolate",
              ["linear"],
              ["zoom"],
              8.4,
              0,
              9.6,
              0.48,
              12.2,
              0.58,
              13.7,
              0.46,
              14.2,
              0,
            ],
          ],
          "line-color": "rgba(165, 180, 252, 0.5)",
          "line-dasharray": [0.32, 2.9],
        },
      },
      VENUE_GLOW_LAYER
    );

    // Venue energy glow (combined_count = inside_count + nearby_count).
    m.addLayer({
      id: VENUE_GLOW_LAYER,
      type: "circle",
      source: VENUE_ACTIVITY_SOURCE,
      paint: {
        "circle-color": venueHeatColorStepExpression() as mapboxgl.Expression,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, [
            "interpolate",
            ["linear"],
            [
              "+",
              0,
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
              0,
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
              0,
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
          ["zoom"],
          10, 0.12,
          14, 0.28,
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
        "circle-color": venueHeatColorStepExpression() as mapboxgl.Expression,
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
          0, 0,
          10, 0,
          11.5, 0.12,
          14, 0.95,
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
          0, 0,
          10, 0,
          11.5, 0.12,
          14, 0.95,
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
        if (m.getLayer(DISTRICT_FLOW_CORE_LAYER_ID)) m.removeLayer(DISTRICT_FLOW_CORE_LAYER_ID);
        if (m.getLayer(DISTRICT_FLOW_GLOW_LAYER_ID)) m.removeLayer(DISTRICT_FLOW_GLOW_LAYER_ID);
        if (m.getLayer(VENUE_HEAT_LAYER)) m.removeLayer(VENUE_HEAT_LAYER);
        if (m.getSource(DISTRICT_FLOW_SOURCE_ID)) m.removeSource(DISTRICT_FLOW_SOURCE_ID);
        if (m.getSource(VENUE_ACTIVITY_SOURCE)) m.removeSource(VENUE_ACTIVITY_SOURCE);
      } catch {
        /* map teardown */
      }
    };
  }, [mapReady, mapStyleEpoch]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !selectedVenueId) return;

    const onMapBlankClick = (e: mapboxgl.MapMouseEvent) => {
      try {
        const hits = m.queryRenderedFeatures(e.point, { layers: [...MAP_VENUE_CLOSE_HIT_LAYERS] });
        if (hits.length > 0) return;
        setSelectedVenueId(null);
      } catch {
        setSelectedVenueId(null);
      }
    };

    m.on("click", onMapBlankClick);
    return () => {
      m.off("click", onMapBlankClick);
    };
  }, [mapReady, mapStyleEpoch, selectedVenueId]);

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
          category_icon: resolveVenueCategoryAccentKey(v),
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
      features: coalesceOverlappingVenueActivityFeatures(features),
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

  /** Global heatmap “breathing” (~5Hz): one cheap paint update, not full GeoJSON per venue per tick.
   *  Mapbox forbids nesting `["zoom"]` inside `["*", …]` for `heatmap-intensity` — scale stops instead. */
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const layerId = VENUE_HEAT_LAYER;
    const id = window.setInterval(() => {
      const wave = 0.88 + 0.12 * ((Math.sin(Date.now() / 520) + 1) / 2);
      try {
        if (m.getLayer(layerId)) {
          m.setPaintProperty(layerId, "heatmap-intensity", [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            0.6 * wave,
            14,
            1.2 * wave,
            18,
            2 * wave,
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

  /* ---------------- DISTRICT FLOW TRAILS (aggregate ambience) ---------------- */
  useEffect(() => {
    applyDistrictFlowFromPresence(districtFlowStateRef.current, {
      presence,
      venues: filteredVenues,
      meId,
      friendIds: Object.keys(friendsById),
      ghostByUserId: presenceGhostById,
      myGhostMode,
      nowMs: Date.now(),
    });
  }, [presence, filteredVenues, meId, friendsById, presenceGhostById, myGhostMode]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const tick = () => {
      const now = Date.now();
      decayDistrictFlowState(districtFlowStateRef.current, now);
      const src = m.getSource(DISTRICT_FLOW_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      let z = mapZoom;
      try {
        z = m.getZoom();
      } catch {
        /* map torn down */
      }
      if (z >= 14.2) {
        try {
          src.setData({ type: "FeatureCollection", features: [] } as any);
        } catch {
          /* noop */
        }
        return;
      }
      const fc = buildDistrictFlowFeatureCollection(
        districtFlowStateRef.current,
        filteredVenuesFlowRef.current,
        now
      );
      try {
        src.setData(fc as any);
      } catch {
        /* noop */
      }
    };
    tick();
    const id = window.setInterval(tick, 230);
    return () => window.clearInterval(id);
  }, [mapReady, mapZoom, mapStyleEpoch]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const id = window.setInterval(() => {
      const t = Date.now() / 1000;
      const off = -((t * 0.85) % 1.6) * 7;
      try {
        if (m.getLayer(DISTRICT_FLOW_GLOW_LAYER_ID)) {
          // Mapbox GL supports dash offset animation; bundled typings omit this paint key.
          m.setPaintProperty(DISTRICT_FLOW_GLOW_LAYER_ID, "line-dashoffset" as any, off);
        }
        if (m.getLayer(DISTRICT_FLOW_CORE_LAYER_ID)) {
          m.setPaintProperty(DISTRICT_FLOW_CORE_LAYER_ID, "line-dashoffset" as any, off * 1.12);
        }
      } catch {
        /* noop */
      }
    }, 96);
    return () => window.clearInterval(id);
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
  if (isWebPresenceWriteRetired()) return;
 // if (hasRunInitialPresence.current) return;


    const run = async () => {
      const venuePayload: VenueForPresenceSync[] = venues.map((v) => ({
        id: v.id,
        name: v.name,
        lat: v.lat,
        lng: v.lng,
        inner_radius_m: v.inner_radius_m,
        outer_radius_m: v.outer_radius_m,
        halo_radius_m: v.halo_radius_m ?? null,
      }));
      const actorLabel =
        myProfile?.display_name?.trim() || myProfile?.username?.trim() || null;
      const { error } = await syncUserPresenceWithVenuesFromCoords(supabase, {
        userId: meId,
        lat: you.lat,
        lng: you.lng,
        venues: venuePayload,
        myGhostMode,
        actorLabel,
      });
      if (error) {
        console.warn("Map: presence sync error:", error.message);
      }
      hasRunInitialPresence.current = true;
    };

    run();
  }, [you, meId, venues, myProfile, myGhostMode]);


  

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
    presenceInterval.current = setInterval(load, 3000);
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
      sizePx: number
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
        avatar.style.background = "linear-gradient(to bottom right, #5B82FF, #3B66FF, #4774FF)";
        avatar.style.display = "grid";
        avatar.style.placeItems = "center";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", `${Math.round(sizePx * 0.58)}`);
        svg.setAttribute("height", `${Math.round(sizePx * 0.58)}`);
        svg.style.color = "rgba(255,255,255,0.95)";
        svg.setAttribute("fill", "none");
        const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c1.setAttribute("cx", "12");
        c1.setAttribute("cy", "8.25");
        c1.setAttribute("r", "3.5");
        c1.setAttribute("fill", "currentColor");
        const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p1.setAttribute(
          "d",
          "M5 19.25C5 15.9363 7.68629 13.25 11 13.25H13C16.3137 13.25 19 15.9363 19 19.25V20.25H5V19.25Z"
        );
        p1.setAttribute("fill", "currentColor");
        svg.appendChild(c1);
        svg.appendChild(p1);
        avatar.appendChild(svg);
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
          ? activePresenceByUser.get(id) ?? latestKnownPresenceByUser.get(id)
          : activePresenceByUser.get(id);
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
        ? activePresenceByUser.get(id) ?? latestKnownPresenceByUser.get(id)
        : activePresenceByUser.get(id);
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
      const isLiveNow = isFriendOnlineNow(p.updated_at, now);
      markerEl.type = "button";
      markerEl.style.width = `${markerSize}px`;
      markerEl.style.height = `${markerSize}px`;
      markerEl.style.borderRadius = "999px";
      markerEl.style.border = "0";
      markerEl.style.padding = "0";
      markerEl.style.background = "transparent";
      markerEl.style.overflow = "visible";
      markerEl.style.boxShadow = isMe
        ? `0 0 0 ${Math.max(2, Math.round(markerSize * 0.14))}px rgba(59,102,255,0.22), 0 0 ${Math.max(8, Math.round(markerSize * 0.42))}px rgba(59,102,255,0.38)`
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
          markerSize
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
        const dayShadow = "0 1px 1px rgba(255,255,255,0.75), 0 0 4px rgba(59,102,255,0.16)";
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
        const avatar = buildAvatarElement(profile?.avatar_url, name, 24);
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
        const online = !!lastSeen && isFriendOnlineNow(lastSeen, now);
        return { id, profile, online, lastSeen, hiddenByGhost };
      })
      .filter((f) => !f.hiddenByGhost)
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        const ta = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const tb = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return tb - ta;
      });
  }, [friendsById, friendProfilesById, presence, presenceUiTick]);

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
            : "border-white/15 bg-primary/55 text-white/85"
        }`}
      >
        {myGhostMode ? "Ghost on" : "Ghost off"}
      </button>
    ) : null;

  const checkpointRingPulseTier = activeCheckpoint
    ? checkpointBarHeatPulseTier(activeCheckpoint.activity)
    : "off";

    return (
    <div className="relative h-[100dvh] min-h-0 w-full flex-1 overflow-hidden bg-primary">
      {!mapReady ? (
        <div
          className="pointer-events-none absolute inset-0 z-[10200] bg-primary"
          aria-hidden
        >
          <MapPageSkeleton />
        </div>
      ) : null}
      <div ref={mapRef} className="absolute inset-0 z-0 min-h-0 w-full min-w-0" />
      {mapReady ? (
      <div className="absolute left-1/2 z-20 flex w-[min(94vw,420px)] -translate-x-1/2 flex-col items-stretch gap-2 top-[calc(env(safe-area-inset-top,0px)+30px)]">
        <aside className="rounded-2xl border border-white/15 bg-primary/60 p-2 backdrop-blur-xl">
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
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-primary/55 px-3 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur transition"
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
                ? "border-accent-violet/55 bg-accent-violet/30 text-white shadow-[0_0_18px_rgba(59,102,255,0.32)]"
                : "border-white/15 bg-primary/55 text-white/85"
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

        {panelMode === "friends" && !storyCameraOrComposerOpen ? (
          <aside className="w-[112px] min-h-[160px] max-h-[min(42vh,280px)] self-end overflow-y-auto rounded-xl border border-white/[0.08] bg-[#121824ee] p-1.5 backdrop-blur-xl">
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
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-gradient-to-br from-[#5B82FF] via-[#3B66FF] to-[#4774FF]">
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
      ) : null}
      {mapReady && !selectedVenue && checkpointPortalEl && !storyCameraOrComposerOpen
        ? createPortal(
            <div
              className={`pointer-events-auto fixed left-1/2 z-[10156] flex w-[min(92vw,460px)] max-w-[460px] -translate-x-1/2 items-center justify-between gap-2 rounded-2xl px-2.5 py-1.5 backdrop-blur relative ${
                mapDayMode
                  ? "border border-black/14 bg-white/78 shadow-[0_8px_30px_rgba(15,20,29,0.1)]"
                  : "border border-white/15 bg-primary/60"
              }`}
              style={{
                bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MAP_NAV_CLEARANCE_PX}px)`,
                ...(activeCheckpoint
                  ? checkpointBarHeatShadowStyle(activeCheckpoint.activity, mapDayMode)
                  : {
                      boxShadow: mapDayMode
                        ? "0 10px 32px rgba(15,20,29,0.12)"
                        : "0 8px 28px rgba(0,0,0,0.22)",
                    }),
              }}
            >
              {activeCheckpoint && checkpointRingPulseTier !== "off" ? (
                <div
                  aria-hidden
                  className={
                    checkpointRingPulseTier === "strong"
                      ? "ah-checkpoint-ring-pulse-strong pointer-events-none absolute inset-0 z-0 rounded-2xl"
                      : "ah-checkpoint-ring-pulse-soft pointer-events-none absolute inset-0 z-0 rounded-2xl"
                  }
                  style={checkpointBarPulseOverlayStyle(activeCheckpoint.activity, mapDayMode)}
                />
              ) : null}
              <button
                type="button"
                onClick={goToPrevCheckpoint}
                className={`relative z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-full border active:bg-white/10 ${
                  mapDayMode
                    ? "border-black/12 bg-white/80 text-[#0b0f14] active:bg-white/92"
                    : "border-white/15 bg-white/5 text-white active:bg-white/10"
                }`}
                aria-label="Previous checkpoint"
              >
                <ChevronLeft
                  size={28}
                  strokeWidth={2.5}
                  className={mapDayMode ? "text-[#0b0f14]/92" : "text-white/95"}
                  aria-hidden
                />
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
                className={`relative z-[1] min-w-0 flex-1 truncate px-2 text-center text-sm font-medium ${
                  mapDayMode ? "text-[#0b0f14]/90" : "text-white/90"
                }`}
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
                className={`relative z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-full border active:bg-white/10 ${
                  mapDayMode
                    ? "border-black/12 bg-white/80 text-[#0b0f14] active:bg-white/92"
                    : "border-white/15 bg-white/5 text-white active:bg-white/10"
                }`}
                aria-label="Next checkpoint"
              >
                <ChevronRight
                  size={28}
                  strokeWidth={2.5}
                  className={mapDayMode ? "text-[#0b0f14]/92" : "text-white/95"}
                  aria-hidden
                />
              </button>
            </div>,
            checkpointPortalEl
          )
        : null}
      {mapReady && selectedVenue ? (
        <section
          className={`absolute inset-x-0 bottom-0 z-[10090] flex h-[74svh] max-h-[760px] flex-col overflow-hidden rounded-t-[1.75rem] backdrop-blur-2xl md:h-[70svh] ${
            mapDayMode
              ? "border-t border-black/[0.08] bg-gradient-to-b from-white/[0.98] via-[#f4f6fa]/[0.99] to-[#e8ecf4] text-[#0b0f14]"
              : "border-t border-white/[0.04] bg-gradient-to-b from-[#141a24]/[0.95] via-[#0e1219]/[0.97] to-[#080b10]/[0.99] text-white"
          }`}
          style={venueSheetStackShadowStyle(selectedVenueActivity, mapDayMode)}
        >
          <div
            className="pointer-events-none absolute inset-0 z-[1] rounded-t-[1.75rem] border ah-premium-surface-pulse"
            style={venueSheetInnerRimStyle(selectedVenueActivity, mapDayMode)}
            aria-hidden
          />
          <div className="relative z-[2] flex min-h-[40px] shrink-0 touch-none items-center justify-center px-4 pb-2 pt-1"
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              sheetDragRef.current = { y: e.clientY, pointerId: e.pointerId };
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }}
            onPointerMove={(e) => {
              const s = sheetDragRef.current;
              if (!s || e.pointerId !== s.pointerId) return;
              if (e.clientY - s.y > 52) {
                sheetDragRef.current = null;
                closeVenueCard();
              }
            }}
            onPointerUp={(e) => {
              if (sheetDragRef.current?.pointerId === e.pointerId) {
                sheetDragRef.current = null;
              }
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }}
            onPointerCancel={() => {
              sheetDragRef.current = null;
            }}
            onWheel={(e) => {
              if (e.deltaY > 20) {
                e.preventDefault();
                closeVenueCard();
              }
            }}
          >
            <div
              className={`h-1 w-12 rounded-full ${mapDayMode ? "bg-black/[0.14]" : "bg-white/[0.18]"}`}
              aria-hidden
            />
            <button
              type="button"
              onClick={closeVenueCard}
              className={`absolute right-3 top-1/2 z-[3] -translate-y-1/2 ${
                mapDayMode
                  ? "grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/76 text-[#0b0f14] shadow-[0_6px_22px_rgba(15,20,29,0.12)] backdrop-blur-xl transition hover:bg-white/88 active:scale-[0.97]"
                  : "ah-glass-control ah-glass-control-interactive grid h-9 w-9 place-items-center rounded-full text-white/88 transition active:scale-[0.97]"
              }`}
              aria-label="Close venue panel"
            >
              <ChevronDown size={18} strokeWidth={2.4} className={mapDayMode ? "text-[#0b0f14]/85" : "text-white/86"} aria-hidden />
            </button>
          </div>
          <div
            className="relative z-[2] mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Hero — no heavy frame; scrim only when photo exists */}
            <div className="relative -mx-0.5 overflow-hidden rounded-2xl">
              {selectedVenue.image_url || selectedVenue.photo_url || selectedVenue.cover_image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      selectedVenue.image_url || selectedVenue.photo_url || selectedVenue.cover_image_url || ""
                    }
                    alt={selectedVenue.name}
                    className="h-[168px] w-full object-cover sm:h-[188px]"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                    aria-hidden
                  />
                </>
              ) : (
                <div
                  className={`relative flex h-[168px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl sm:h-[188px] ${
                    mapDayMode
                      ? "border border-black/10 bg-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl"
                      : "ah-glass-control rounded-2xl"
                  }`}
                >
                  <span
                    className={`select-none text-[3.25rem] font-black leading-none tracking-tighter ${
                      mapDayMode ? "text-[#1e293b]/[0.14]" : "text-white/[0.08]"
                    }`}
                    aria-hidden
                  >
                    {initialsFromName(selectedVenue.name)}
                  </span>
                  <p
                    className={`absolute bottom-4 left-0 right-0 text-center text-[11px] font-medium ${
                      mapDayMode ? "text-[#64748b]" : "text-white/38"
                    }`}
                  >
                    Preview drops when we have art for this spot
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2
                  className={`text-[1.35rem] font-bold leading-tight tracking-tight ${
                    mapDayMode ? "text-[#0b0f14]" : "text-white"
                  }`}
                >
                  {selectedVenue.name}
                </h2>
                <p
                  className={`mt-1.5 text-[13px] leading-snug ${
                    mapDayMode ? "text-[#5f6b7a]" : "text-white/55"
                  }`}
                >
                  {formatVenueCategoryLabel(selectedVenue.category)}
                  {currentUserCoords ? (
                    <>
                      {" · "}
                      {formatMilesFromMeters(
                        distanceMeters(
                          currentUserCoords.lat,
                          currentUserCoords.lng,
                          selectedVenue.lat,
                          selectedVenue.lng
                        )
                      )}{" "}
                      out
                    </>
                  ) : (
                    <> · Getting your distance…</>
                  )}
                </p>
                {selectedVenueContextLine ? (
                  <p
                    className={`mt-2 text-[12px] font-medium leading-snug ${
                      mapDayMode ? "text-[#475569]" : "text-white/48"
                    }`}
                  >
                    {selectedVenueContextLine}
                  </p>
                ) : null}
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
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-[0.97] ${
                    mapDayMode
                      ? "border border-black/10 bg-white/72 text-[#0b0f14] shadow-[0_8px_28px_rgba(15,20,29,0.12)] backdrop-blur-xl hover:bg-white/88"
                      : "ah-glass-control ah-glass-control-interactive text-white/90 hover:bg-[rgb(10_12_24/0.82)]"
                  }`}
                  aria-label="Open directions"
                >
                  <Navigation size={17} strokeWidth={2.1} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const lat = selectedVenue.lat;
                    const lng = selectedVenue.lng;
                    const label = encodeURIComponent(selectedVenue.name);
                    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
                    const isIOS = /iPad|iPhone|iPod/.test(ua);
                    const href = isIOS
                      ? `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`
                      : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                    window.open(href, "_blank");
                  }}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-[0.97] ${
                    mapDayMode
                      ? "border border-black/10 bg-white/72 text-[#0b0f14] shadow-[0_8px_28px_rgba(15,20,29,0.12)] backdrop-blur-xl hover:bg-white/88"
                      : "ah-glass-control ah-glass-control-interactive text-white/90 hover:bg-[rgb(10_12_24/0.82)]"
                  }`}
                  aria-label="Open in maps"
                >
                  <MapsAppIcon size={17} strokeWidth={2.1} aria-hidden />
                </button>
              </div>
            </div>

            {/* Density — one strip, no candy-colored boxes */}
            <div
              className={`mt-5 flex rounded-2xl px-1 py-4 ${
                mapDayMode
                  ? "border border-black/10 bg-white/58 shadow-[0_8px_32px_rgba(15,20,29,0.08)] backdrop-blur-xl"
                  : "ah-glass-control"
              }`}
            >
              <div className="min-w-0 flex-1 text-center">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
                    mapDayMode ? "text-[#7a8698]" : "text-white/40"
                  }`}
                >
                  Inside
                </p>
                <p
                  className={`mt-1.5 text-[1.75rem] font-bold tabular-nums leading-none ${
                    mapDayMode ? "text-[#0b0f14]" : "text-white"
                  }`}
                >
                  {selectedVenuePeople.insideAll.length}
                </p>
                <p className={`mt-1 text-[12px] font-medium ${mapDayMode ? "text-[#64748b]" : "text-white/45"}`}>
                  {selectedVenuePeople.insideFriends.length
                    ? `${selectedVenuePeople.insideFriends.length} from your list`
                    : "None from your list"}
                </p>
              </div>
              <div
                className={`mx-1 w-px shrink-0 self-stretch ${mapDayMode ? "bg-black/[0.07]" : "bg-white/[0.09]"}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-center">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
                    mapDayMode ? "text-[#7a8698]" : "text-white/40"
                  }`}
                >
                  Nearby
                </p>
                <p
                  className={`mt-1.5 text-[1.75rem] font-bold tabular-nums leading-none ${
                    mapDayMode ? "text-[#0b0f14]" : "text-white"
                  }`}
                >
                  {selectedVenuePeople.nearbyAll.length}
                </p>
                <p className={`mt-1 text-[12px] font-medium ${mapDayMode ? "text-[#64748b]" : "text-white/45"}`}>
                  {selectedVenuePeople.nearbyFriends.length
                    ? `${selectedVenuePeople.nearbyFriends.length} from your list`
                    : "None from your list"}
                </p>
              </div>
            </div>

            {/* Friends — chips + scroll, no duplicate avatar+name stacks */}
            <div
              className={`mt-5 space-y-5 rounded-2xl p-4 ${
                mapDayMode
                  ? "border border-black/10 bg-white/52 shadow-[0_8px_32px_rgba(15,20,29,0.06)] backdrop-blur-xl"
                  : "ah-glass-control"
              }`}
            >
              {selectedVenuePeople.insideFriends.length > 0 ? (
                <div>
                  <p
                    className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
                      mapDayMode ? "text-[#7a8698]" : "text-white/42"
                    }`}
                  >
                    Friends checked in
                  </p>
                  <div className="scrollbar-none mt-2.5 flex gap-2 overflow-x-auto pb-0.5 pt-0.5">
                    {selectedVenuePeople.insideFriends.map((friend) => {
                      const profile = friendProfilesById[friend.user_id];
                      return (
                        <button
                          key={friend.user_id}
                          type="button"
                          onClick={() => focusFriendOnMap(friend.user_id)}
                          className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 transition active:scale-[0.98] ${
                            mapDayMode
                              ? "border border-black/10 bg-white/78 shadow-[0_2px_12px_rgba(15,20,29,0.08)] backdrop-blur-xl hover:bg-white/92"
                              : "rounded-full border border-white/14 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl hover:bg-white/[0.11]"
                          }`}
                        >
                          {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className={`h-8 w-8 rounded-full object-cover ${
                                mapDayMode ? "ring-1 ring-black/[0.06]" : "ring-1 ring-white/15"
                              }`}
                            />
                          ) : (
                            <div
                              className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold ${
                                mapDayMode
                                  ? "bg-[#e8ecf4] text-[#334155]"
                                  : "bg-white/10 text-white/90"
                              }`}
                            >
                              {initialsFromName(friend.name)}
                            </div>
                          )}
                          <span
                            className={`max-w-[7.5rem] truncate text-left text-[12px] font-semibold ${
                              mapDayMode ? "text-[#0f172a]" : "text-white/92"
                            }`}
                          >
                            {friend.name}
                          </span>
                          {friend.isRecentPresence ? (
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                mapDayMode ? "bg-accent-violet" : "bg-accent-violet-active"
                              }`}
                              title="Recent signal"
                              aria-label="Recent presence"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : selectedVenuePeople.insideAll.length > 0 ? (
                <p className={`text-[13px] leading-relaxed ${mapDayMode ? "text-[#5f6b7a]" : "text-white/50"}`}>
                  {selectedVenuePeople.insideAll.length} people in this pin—none on your friends list yet.
                </p>
              ) : (
                <p className={`text-[13px] leading-relaxed ${mapDayMode ? "text-[#5f6b7a]" : "text-white/48"}`}>
                  Quiet pin for now. When the night spikes, faces stack here first.
                </p>
              )}

              {selectedVenuePeople.nearbyFriends.length > 0 ? (
                <div>
                  <p
                    className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
                      mapDayMode ? "text-[#7a8698]" : "text-white/42"
                    }`}
                  >
                    Friends in the radius
                  </p>
                  <div className="scrollbar-none mt-2.5 flex gap-2 overflow-x-auto pb-0.5 pt-0.5">
                    {selectedVenuePeople.nearbyFriends.map((friend) => {
                      const profile = friendProfilesById[friend.user_id];
                      return (
                        <button
                          key={`near-${friend.user_id}`}
                          type="button"
                          onClick={() => focusFriendOnMap(friend.user_id)}
                          className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 transition active:scale-[0.98] ${
                            mapDayMode
                              ? "border border-black/10 bg-white/78 shadow-[0_2px_12px_rgba(15,20,29,0.08)] backdrop-blur-xl hover:bg-white/92"
                              : "rounded-full border border-white/14 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl hover:bg-white/[0.11]"
                          }`}
                        >
                          {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className={`h-8 w-8 rounded-full object-cover ${
                                mapDayMode ? "ring-1 ring-black/[0.06]" : "ring-1 ring-white/12"
                              }`}
                            />
                          ) : (
                            <div
                              className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold ${
                                mapDayMode ? "bg-[#e8ecf4] text-[#334155]" : "bg-white/10 text-white/90"
                              }`}
                            >
                              {initialsFromName(friend.name)}
                            </div>
                          )}
                          <span
                            className={`max-w-[7.5rem] truncate text-left text-[12px] font-semibold ${
                              mapDayMode ? "text-[#0f172a]" : "text-white/88"
                            }`}
                          >
                            {friend.name}
                          </span>
                          {friend.isRecentPresence ? (
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                mapDayMode ? "bg-accent-violet" : "bg-accent-violet-active"
                              }`}
                              title="Recent signal"
                              aria-label="Recent presence"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : selectedVenuePeople.insideFriends.length > 0 ? (
                <p className={`text-[12px] leading-relaxed ${mapDayMode ? "text-[#64748b]" : "text-white/42"}`}>
                  Outer ring is clear of your friends—slide the map or grab another pin.
                </p>
              ) : selectedVenuePeople.nearbyAll.length > 0 ? (
                <p className={`text-[12px] leading-relaxed ${mapDayMode ? "text-[#64748b]" : "text-white/42"}`}>
                  {selectedVenuePeople.nearbyAll.length} people in range—none on your list yet.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                router.push(
                  `/venue-activity?venueId=${encodeURIComponent(selectedVenue.id)}&mapTone=${mapDayMode ? "day" : "night"}`
                );
              }}
              className={`mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl border py-3.5 text-[15px] font-bold tracking-tight transition active:scale-[0.99] ${
                mapDayMode
                  ? "border-black/10 bg-gradient-to-b from-white via-[#f7f8fb] to-[#eef1f6] text-[#0b0f14] hover:brightness-[1.02]"
                  : "border-transparent bg-gradient-to-r from-accent-violet-active via-accent-violet to-[#3558d4] text-white shadow-[0_0_44px_rgba(59,102,255,0.38)] hover:brightness-110"
              }`}
              style={mapDayMode ? checkpointBarHeatShadowStyle(selectedVenueActivity, true) : undefined}
            >
              <Sparkles
                size={18}
                strokeWidth={2.2}
                className={mapDayMode ? "shrink-0" : "shrink-0 text-white/95"}
                style={mapDayMode ? { color: venueHeatHexFromActivity(selectedVenueActivity) } : undefined}
                aria-hidden
              />
              Check the scene
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-[100dvh] w-screen bg-primary" aria-hidden />}>
        <MapPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
