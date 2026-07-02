/** Stars brightest in outer space; soften with zoom but stay visible when zoomed in. */
const STAR_FADE_START_ZOOM = 4.5;
const STAR_FADE_END_ZOOM = 17;
const STAR_FLOOR_NIGHT = 0.24;
const STAR_FLOOR_DAY = 0.1;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function starIntensityForZoom(zoom: number, dayMode: boolean): number {
  const peak = dayMode ? 0.72 : 0.98;
  const floor = dayMode ? STAR_FLOOR_DAY : STAR_FLOOR_NIGHT;
  if (!Number.isFinite(zoom)) return floor;
  if (zoom >= STAR_FADE_END_ZOOM) return floor;
  if (zoom <= STAR_FADE_START_ZOOM) return peak;
  const t = clamp01((zoom - STAR_FADE_START_ZOOM) / (STAR_FADE_END_ZOOM - STAR_FADE_START_ZOOM));
  return floor + (peak - floor) * (1 - t * t);
}

function horizonBlendForZoom(zoom: number, dayMode: boolean): number {
  if (dayMode) return 0.22;
  if (zoom >= STAR_FADE_END_ZOOM) return 0.12;
  if (zoom <= STAR_FADE_START_ZOOM) return 0.06;
  const t = clamp01((zoom - STAR_FADE_START_ZOOM) / (STAR_FADE_END_ZOOM - STAR_FADE_START_ZOOM));
  return 0.06 + t * 0.06;
}

export function fogPropsForDayMode(dayMode: boolean, zoom = 14) {
  const starIntensity = starIntensityForZoom(zoom, dayMode);
  const inSpace = starIntensity > 0.04;

  if (dayMode) {
    return {
      range: [1, 10] as [number, number],
      color: "#eef0f4",
      "high-color": inSpace ? "#6b8fc7" : "#e5e8ef",
      "horizon-blend": horizonBlendForZoom(zoom, true),
      "space-color": "#050814",
      "star-intensity": starIntensity,
    };
  }

  return {
    range: [0.85, 8] as [number, number],
    color: "#0c1118",
    "high-color": inSpace ? "#1e4080" : "#131b26",
    "horizon-blend": horizonBlendForZoom(zoom, false),
    "space-color": "#050814",
    "star-intensity": starIntensity,
  };
}
