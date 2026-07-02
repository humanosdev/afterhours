/**
 * PWA map **day mode** chrome — matches `mapDayMode` branches in `apps/web/src/app/map/page.tsx`.
 * Native VP-2 uses day shell by default (light basemap); night toggle can come later.
 */
export const mapDayChrome = {
  ink: "#0b0f14",
  ink90: "rgba(11, 15, 20, 0.9)",
  ink92: "rgba(11, 15, 20, 0.92)",
  muted: "#5f6b7a",
  muted2: "#64748b",
  caption: "#475569",
  labelUpper: "#7a8698",

  checkpointBarBg: "rgba(255, 255, 255, 0.78)",
  checkpointBarBorder: "rgba(0, 0, 0, 0.14)",
  checkpointBarShadow: "rgba(15, 20, 29, 0.1)",
  checkpointNavBg: "rgba(255, 255, 255, 0.8)",
  checkpointNavBorder: "rgba(0, 0, 0, 0.12)",

  sheetBg: "#f4f6fa",
  sheetBgTop: "rgba(255, 255, 255, 0.98)",
  sheetBgBottom: "#e8ecf4",
  sheetBorder: "rgba(0, 0, 0, 0.08)",
  sheetHandle: "rgba(0, 0, 0, 0.14)",
  sheetCloseBg: "rgba(255, 255, 255, 0.76)",
  sheetCloseBorder: "rgba(0, 0, 0, 0.1)",

  panelBg: "rgba(255, 255, 255, 0.58)",
  panelBorder: "rgba(0, 0, 0, 0.1)",
  panelBgSoft: "rgba(255, 255, 255, 0.52)",

  ctaBgTop: "#ffffff",
  ctaBgMid: "#f7f8fb",
  ctaBgBottom: "#eef1f6",
  ctaBorder: "rgba(0, 0, 0, 0.1)",

  /** Map label layer (SymbolLayer). */
  venueLabelColor: "#0b0f14",
  venueLabelHalo: "#ffffff",
} as const;

/** Night map chrome — PWA `mapDayMode === false` checkpoint/sheet branches. */
export const mapNightChrome = {
  ink: "#ffffff",
  ink90: "rgba(255, 255, 255, 0.9)",
  ink92: "rgba(255, 255, 255, 0.95)",
  muted: "rgba(255, 255, 255, 0.55)",
  muted2: "rgba(255, 255, 255, 0.45)",
  caption: "rgba(255, 255, 255, 0.48)",
  labelUpper: "rgba(255, 255, 255, 0.4)",

  checkpointBarBg: "rgba(18, 22, 31, 0.82)",
  checkpointBarBorder: "rgba(255, 255, 255, 0.1)",
  checkpointBarShadow: "rgba(0, 0, 0, 0.35)",
  checkpointNavBg: "rgba(22, 28, 38, 0.88)",
  checkpointNavBorder: "rgba(255, 255, 255, 0.12)",

  sheetBg: "#12161f",
  sheetBgTop: "rgba(18, 22, 31, 0.98)",
  sheetBgBottom: "#0e1219",
  sheetBorder: "rgba(255, 255, 255, 0.04)",
  sheetHandle: "rgba(255, 255, 255, 0.18)",
  sheetCloseBg: "rgba(22, 28, 38, 0.9)",
  sheetCloseBorder: "rgba(255, 255, 255, 0.1)",

  panelBg: "rgba(22, 28, 38, 0.72)",
  panelBorder: "rgba(255, 255, 255, 0.09)",
  panelBgSoft: "rgba(18, 22, 31, 0.65)",

  ctaBgTop: "#1a2030",
  ctaBgMid: "#141a26",
  ctaBgBottom: "#0e1219",
  ctaBorder: "rgba(255, 255, 255, 0.1)",

  venueLabelColor: "rgba(255, 255, 255, 0.95)",
  venueLabelHalo: "#0b0f14",
} as const;

export type MapChromeTokens = {
  ink: string;
  ink90: string;
  ink92: string;
  muted: string;
  muted2: string;
  caption: string;
  labelUpper: string;
  checkpointBarBg: string;
  checkpointBarBorder: string;
  checkpointBarShadow: string;
  checkpointNavBg: string;
  checkpointNavBorder: string;
  sheetBg: string;
  sheetBgTop: string;
  sheetBgBottom: string;
  sheetBorder: string;
  sheetHandle: string;
  sheetCloseBg: string;
  sheetCloseBorder: string;
  panelBg: string;
  panelBorder: string;
  panelBgSoft: string;
  ctaBgTop: string;
  ctaBgMid: string;
  ctaBgBottom: string;
  ctaBorder: string;
  venueLabelColor: string;
  venueLabelHalo: string;
};

export function mapChromeForMode(dayMode: boolean): MapChromeTokens {
  return dayMode ? mapDayChrome : mapNightChrome;
}

export const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";
export const MAP_STYLE_NIGHT = "mapbox://styles/mapbox/dark-v11";

/** PWA `localHourIsMapDaytime` — light 7:00–17:59, night from 18:00. */
export function localHourIsMapDaytime(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 7 && h < 18;
}

export function mapStyleUrlForDayMode(day: boolean): string {
  return day ? MAP_STYLE_LIGHT : MAP_STYLE_NIGHT;
}

export function mapStyleUrlForLocalClock(date = new Date()): string {
  return mapStyleUrlForDayMode(localHourIsMapDaytime(date));
}
