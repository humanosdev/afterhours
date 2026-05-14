import {
  isLikelyMapFallbackPresence,
  isValidCoordinatePair,
} from "@/lib/presence";

export const DISTRICT_FLOW_SOURCE_ID = "district-flow-source";
export const DISTRICT_FLOW_GLOW_LAYER_ID = "district-flow-glow";
export const DISTRICT_FLOW_CORE_LAYER_ID = "district-flow-core";

/** Trails linger ~10–20s then vanish (visual half-life via opacity curve). */
export const DISTRICT_FLOW_FADE_MS = 18_000;
/** Ignore absurd venue hops (bad rows / teleports). */
export const DISTRICT_FLOW_MAX_EDGE_M = 3200;
/** Cap simultaneous rendered curves — rest are dropped by score. */
export const DISTRICT_FLOW_MAX_FEATURES = 14;
/** Soft lateral bend for “wind / neural” arcs (meters). */
export const DISTRICT_FLOW_BEND_M = 220;

export type DistrictFlowVenue = {
  id: string;
  lat: number;
  lng: number;
  outer_radius_m: number;
};

export type DistrictFlowPresence = {
  user_id: string;
  lng: number;
  lat: number;
  updated_at: string;
  venue_id: string | null;
  venue_state: "outside" | "inner_pending" | "inner_confirmed" | null;
  zone_type: "inner" | "outer" | "halo" | null;
};

export type DistrictFlowEdge = {
  fromId: string;
  toId: string;
  /** Recent traffic weight (decays over time). */
  strength: number;
  lastBumpMs: number;
};

export type DistrictFlowState = {
  anchorByUser: Map<string, string | null>;
  edges: Map<string, DistrictFlowEdge>;
};

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export function resolveDistrictFlowVenueAnchor(
  p: DistrictFlowPresence,
  venues: DistrictFlowVenue[]
): string | null {
  if (
    p.venue_id &&
    (p.venue_state === "inner_confirmed" || p.zone_type === "inner")
  ) {
    if (venues.some((v) => v.id === p.venue_id)) return p.venue_id;
  }
  let best: { id: string; d: number } | null = null;
  for (const v of venues) {
    const d = distanceMeters(p.lat, p.lng, v.lat, v.lng);
    if (d <= v.outer_radius_m && (!best || d < best.d)) {
      best = { id: v.id, d };
    }
  }
  return best?.id ?? null;
}

export function pickLatestPresenceByUser(rows: DistrictFlowPresence[]): Map<string, DistrictFlowPresence> {
  const m = new Map<string, DistrictFlowPresence>();
  for (const p of rows) {
    const prev = m.get(p.user_id);
    if (!prev || new Date(prev.updated_at).getTime() < new Date(p.updated_at).getTime()) {
      m.set(p.user_id, p);
    }
  }
  return m;
}

function edgeKey(fromId: string, toId: string): string {
  return `${fromId}>${toId}`;
}

function quadraticBezierLngLat(
  a: [number, number],
  b: [number, number],
  bendM: number,
  segments: number
): [number, number][] {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const mlng = (lng1 + lng2) / 2;
  const mlat = (lat1 + lat2) / 2;
  const latRad = (mlat * Math.PI) / 180;
  const cosLat = Math.max(0.25, Math.cos(latRad));
  const ex = (lng2 - lng1) * 111320 * cosLat;
  const ny = (lat2 - lat1) * 111320;
  const len = Math.hypot(ex, ny) || 1;
  const px = (-ny / len) * bendM;
  const py = (ex / len) * bendM;
  const clng = mlng + px / (111320 * cosLat);
  const clat = mlat + py / 111320;
  const out: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const omt = 1 - t;
    const lng = omt * omt * lng1 + 2 * omt * t * clng + t * t * lng2;
    const lat = omt * omt * lat1 + 2 * omt * t * clat + t * t * lat2;
    out.push([lng, lat]);
  }
  return out;
}

/**
 * Updates internal edge weights from venue anchor transitions (aggregate only).
 * Call on each presence refresh; does not render.
 */
export function applyDistrictFlowFromPresence(
  state: DistrictFlowState,
  args: {
    presence: DistrictFlowPresence[];
    venues: DistrictFlowVenue[];
    meId: string | null;
    friendIds: string[];
    ghostByUserId: Record<string, boolean>;
    myGhostMode: boolean;
    nowMs: number;
  }
): void {
  const { presence, venues, meId, friendIds, ghostByUserId, myGhostMode, nowMs } = args;
  const allowed = new Set<string>([...friendIds, ...(meId ? [meId] : [])]);
  const latest = pickLatestPresenceByUser(presence);

  for (const id of allowed) {
    const p = latest.get(id);
    if (!p || !isValidCoordinatePair(p.lat, p.lng)) continue;
    if (isLikelyMapFallbackPresence(p.lat, p.lng)) continue;

    const isMe = id === meId;
    const ghost = isMe ? myGhostMode : !!ghostByUserId[id];
    if (ghost) {
      state.anchorByUser.delete(id);
      continue;
    }

    const anchor = resolveDistrictFlowVenueAnchor(p, venues);
    const prev = state.anchorByUser.get(id) ?? null;
    state.anchorByUser.set(id, anchor);

    if (prev === null || anchor === null || prev === anchor) continue;

    const fromV = venues.find((v) => v.id === prev);
    const toV = venues.find((v) => v.id === anchor);
    if (!fromV || !toV) continue;

    const hop = distanceMeters(fromV.lat, fromV.lng, toV.lat, toV.lng);
    if (!Number.isFinite(hop) || hop > DISTRICT_FLOW_MAX_EDGE_M) continue;

    const key = edgeKey(prev, anchor);
    const cur = state.edges.get(key);
    if (cur) {
      cur.strength = Math.min(12, cur.strength + 1);
      cur.lastBumpMs = nowMs;
    } else {
      state.edges.set(key, {
        fromId: prev,
        toId: anchor,
        strength: 1,
        lastBumpMs: nowMs,
      });
    }
  }

  // Drop anchors for users no longer in the allowed graph
  for (const uid of state.anchorByUser.keys()) {
    if (!allowed.has(uid)) state.anchorByUser.delete(uid);
  }
}

/**
 * Age-out edges and soften strength between presence polls.
 */
export function decayDistrictFlowState(state: DistrictFlowState, nowMs: number): void {
  const fade = DISTRICT_FLOW_FADE_MS;
  for (const [key, e] of state.edges) {
    const age = nowMs - e.lastBumpMs;
    if (age > fade + 1200) {
      state.edges.delete(key);
      continue;
    }
    // Gentle decay so volume reads as “traffic” not binary spikes
    e.strength *= 0.992;
    if (e.strength < 0.08) state.edges.delete(key);
  }
}

type FlowLineFeature = {
  type: "Feature";
  properties: { strength: number; recency: number; pulse: number };
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

export function buildDistrictFlowFeatureCollection(
  state: DistrictFlowState,
  venues: DistrictFlowVenue[],
  nowMs: number
): { type: "FeatureCollection"; features: FlowLineFeature[] } {
  const fade = DISTRICT_FLOW_FADE_MS;
  const vById = new Map(venues.map((v) => [v.id, v] as const));

  type Scored = { key: string; edge: DistrictFlowEdge; score: number };
  const scored: Scored[] = [];
  for (const [key, edge] of state.edges) {
    const age = nowMs - edge.lastBumpMs;
    if (age > fade + 800) continue;
    const recency = Math.max(0, 1 - age / fade);
    const score = edge.strength * (0.35 + 0.65 * recency);
    scored.push({ key, edge, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, DISTRICT_FLOW_MAX_FEATURES);

  const features: FlowLineFeature[] = [];
  for (const { edge } of top) {
    const a = vById.get(edge.fromId);
    const b = vById.get(edge.toId);
    if (!a || !b) continue;

    const coords = quadraticBezierLngLat(
      [a.lng, a.lat],
      [b.lng, b.lat],
      DISTRICT_FLOW_BEND_M,
      28
    );

    const age = nowMs - edge.lastBumpMs;
    const recency = Math.max(0, 1 - age / fade);
    const pulse = 0.55 + 0.45 * recency;

    features.push({
      type: "Feature",
      properties: {
        strength: edge.strength,
        recency: recency,
        pulse,
      },
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    });
  }

  return { type: "FeatureCollection", features };
}
