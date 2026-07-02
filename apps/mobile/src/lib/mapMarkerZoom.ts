/** PWA `markerSizeForZoom` — shrink pins as user zooms in (zoom 4 → 14). */
export function markerSizeForZoom(zoom: number): number {
  const minSize = 13;
  const maxSize = 30;
  const t = Math.max(0, Math.min(1, (zoom - 4) / 10));
  return Math.round(minSize + (maxSize - minSize) * t);
}

/** PWA `isGlobeView` — presence markers not placed below zoom 8 (no empty ring leftover). */
export function shouldShowPresenceMarkers(zoom: number): boolean {
  return zoom >= 8;
}

/** Linear interpolate numeric stops (PWA Mapbox `interpolate` behavior). */
function interpolateLinearStops(
  zoom: number,
  stops: readonly { zoom: number; value: number }[]
): number {
  const z = Number.isFinite(zoom) ? zoom : stops[stops.length - 1]!.zoom;
  if (z <= stops[0]!.zoom) return stops[0]!.value;
  if (z >= stops[stops.length - 1]!.zoom) return stops[stops.length - 1]!.value;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (z >= a.zoom && z <= b.zoom) {
      const t = (z - a.zoom) / (b.zoom - a.zoom);
      return a.value + t * (b.value - a.value);
    }
  }
  return stops[stops.length - 1]!.value;
}

/** Pins fade in with zoom — hidden at regional/earth view (matches glow handoff). */
const PIN_ZOOM_FADE_STOPS = [
  { zoom: 0, value: 0 },
  { zoom: 10, value: 0 },
  { zoom: 11.5, value: 0.12 },
  { zoom: 14, value: 0.95 },
] as const;

/**
 * Category pin opacity — zoom fade only (not crowd-gated at low zoom).
 * Matches venue glow: invisible when zoomed out, readable when zoomed in.
 */
export function categoryPinOpacityForZoom(zoom: number, _combinedCount = 0): number {
  return interpolateLinearStops(zoom, PIN_ZOOM_FADE_STOPS);
}

/** PWA `venues-anchor` `icon-size` — glyphs shrink when zoomed out so they don't vanish abruptly. */
const PWA_ICON_SIZE_STOPS = [
  { zoom: 0, value: 0.28 },
  { zoom: 4, value: 0.4 },
  { zoom: 8, value: 0.66 },
  { zoom: 10, value: 1.16 },
  { zoom: 14, value: 1.42 },
  { zoom: 18, value: 1.58 },
] as const;

/** Native glyph base matches PWA display at zoom ~10 (`icon-size` 1.16). */
const NATIVE_CATEGORY_ICON_BASE_PX = 22;
const PWA_ICON_SIZE_AT_STREET = 1.16;

export function categoryPinIconSizeForZoom(zoom: number, selected = false): number {
  const pwaScale = interpolateLinearStops(zoom, PWA_ICON_SIZE_STOPS);
  const px = Math.round((NATIVE_CATEGORY_ICON_BASE_PX * pwaScale) / PWA_ICON_SIZE_AT_STREET);
  const minPx = 8;
  const base = Math.max(minPx, px);
  return selected ? Math.round(base * 1.09) : base;
}

/** PWA `venues-name-labels` minzoom 11.6 — hidden only at world/globe zoom, not when zoomed in. */
export function shouldShowVenueNameLabels(zoom: number): boolean {
  return zoom >= 11.6;
}

/** Venue name labels — same zoom fade as category pins. */
export const venuePinLabelOpacityStyle = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  0,
  10,
  0,
  11.5,
  0.12,
  14,
  0.95,
] as const;

/** Avatar stack beside category pin — between legacy [16, -26] and pin-hugging offset. */
export function venuePresenceClusterOffsetForZoom(
  zoom: number,
  selected = false
): { translateX: number; translateY: number } {
  const pinSize = categoryPinIconSizeForZoom(zoom, selected);
  return {
    translateX: Math.round(pinSize * 0.58 + 9),
    translateY: -Math.round(pinSize * 0.42 + 7),
  };
}
