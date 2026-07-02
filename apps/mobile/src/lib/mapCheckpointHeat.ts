import { venueHeatHexFromActivity } from "@intencity/shared";

/** PWA `venueCombinedActivityToHeatHex` + checkpoint bar edge tint. */
export function heatHexToRgba(hex: string, alpha: number): string {
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

export function checkpointBarHeatBorderColor(activity: number, dayMode: boolean): string {
  const heat = venueHeatHexFromActivity(activity);
  return heatHexToRgba(heat, dayMode ? 0.34 : 0.24);
}

export function checkpointBarHeatShadowColor(activity: number, dayMode: boolean): string {
  const heat = venueHeatHexFromActivity(activity);
  return heatHexToRgba(heat, dayMode ? 0.44 : 0.32);
}

export type CheckpointHeatPulseTier = "off" | "soft" | "strong";

export function checkpointBarHeatPulseTier(activity: number): CheckpointHeatPulseTier {
  const n = Math.max(0, Math.round(Number.isFinite(activity) ? activity : 0));
  if (n >= 16) return "strong";
  if (n >= 9) return "soft";
  return "off";
}

/** PWA `venueSheetInnerRimStyle` — heat-keyed top rim (grey `#7c8aa0` when activity 0). */
export function venueSheetHeatBorderColor(activity: number, dayMode: boolean): string {
  const heat = venueHeatHexFromActivity(activity);
  return heatHexToRgba(heat, dayMode ? 0.34 : 0.3);
}

export function venueSheetHeatGlowColor(activity: number, dayMode: boolean): string {
  const heat = venueHeatHexFromActivity(activity);
  return heatHexToRgba(heat, dayMode ? 0.16 : 0.22);
}

export function venueSheetStackShadowColor(activity: number, dayMode: boolean): string {
  const heat = venueHeatHexFromActivity(activity);
  return heatHexToRgba(heat, dayMode ? 0.24 : 0.34);
}
