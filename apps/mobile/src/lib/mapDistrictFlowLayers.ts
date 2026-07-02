import { districtFlowDashOffsets } from "./districtFlowDashoffset";

/** PWA `district-flow-glow` / `district-flow-core` paint — hidden at zoom ≥ 14.2. */
export const DISTRICT_FLOW_MAX_ZOOM = 14.2;

const districtFlowGlowLineStyleBase = {
  lineCap: "round",
  lineJoin: "round",
  lineWidth: [
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
  lineBlur: 5,
  lineOpacity: [
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
  lineColor: "rgba(99, 102, 241, 0.5)",
  lineDasharray: [0.22, 3.1],
} as const;

const districtFlowCoreLineStyleBase = {
  lineCap: "round",
  lineJoin: "round",
  lineWidth: [
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
  lineBlur: 1.1,
  lineOpacity: [
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
  lineColor: "rgba(165, 180, 252, 0.5)",
  lineDasharray: [0.32, 2.9],
} as const;

/** Static styles (no dash march) — tests / fallback. */
export const districtFlowGlowLineStyle = districtFlowGlowLineStyleBase;
export const districtFlowCoreLineStyle = districtFlowCoreLineStyleBase;

/** PWA 96ms `line-dashoffset` march on glow + core layers. */
export function districtFlowGlowLineStyleAnimated(nowMs = Date.now()): Record<string, unknown> {
  const { glow } = districtFlowDashOffsets(nowMs);
  return {
    ...districtFlowGlowLineStyleBase,
    lineDashoffset: glow,
  };
}

export function districtFlowCoreLineStyleAnimated(nowMs = Date.now()): Record<string, unknown> {
  const { core } = districtFlowDashOffsets(nowMs);
  return {
    ...districtFlowCoreLineStyleBase,
    lineDashoffset: core,
  };
}
