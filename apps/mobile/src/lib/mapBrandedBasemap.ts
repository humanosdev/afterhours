/**
 * PWA `applyBrandedBasemapTheme` + `applyBasemapMinimalDetail` for native Mapbox.
 * @see apps/web/src/app/map/page.tsx
 */
import { MAP_STREETS_LAYER_MANIFEST } from "./mapStreetsLayerManifest";

export const MAP_BRAND_TINT_LAYER = "map-brand-tone-overlay";

export type BrandedBasemapLayerKind = "background" | "fill" | "line" | "symbol" | "hide";

export type BrandedBasemapLayerSpec = {
  id: string;
  kind: BrandedBasemapLayerKind;
  /** Original Mapbox layer type (needed to hide fill-extrusion vs symbol vs line). */
  sourceType?: string;
  style?: Record<string, unknown>;
};

function noiseLineId(id: string): boolean {
  const l = id.toLowerCase();
  if (!l.includes("road-") && !l.includes("bridge-") && !l.includes("tunnel-")) return false;
  return /\b(path|pedestrian|service|track|steps|minor|construction)\b/.test(l);
}

function transitLineId(id: string): boolean {
  const l = id.toLowerCase();
  return l.startsWith("transit") || /\b(rail|subway|tram|monorail|funicular|ferry)\b/.test(l);
}

/** PWA night/day basemap paint tokens. */
export function brandedBasemapPalette(dayMode: boolean) {
  return {
    roadColor: dayMode ? "#C5CBD6" : "#2a3344",
    roadOutlineColor: dayMode ? "#B4BCC8" : "#232c3a",
    labelColor: dayMode ? "#4A5568" : "#8896a8",
    mutedLabelColor: dayMode ? "#718096" : "#6a7585",
    waterColor: dayMode ? "#A8BED9" : "#0A1624",
    parkColor: dayMode ? "#B4C9B0" : "#1A2520",
    landColor: dayMode ? "#F1F3F6" : "#0f141d",
    bgColor: dayMode ? "#F7F8FA" : "#0b1017",
    brandTintOpacity: dayMode ? 0.028 : 0.032,
    labelHaloColor: dayMode ? "rgba(247,248,250,0.9)" : "rgba(11,16,23,0.88)",
    labelHaloWidth: dayMode ? 0.8 : 0.55,
  };
}

/** Layer paint / visibility overrides applied with `existing` on Mapbox v11 core styles. */
export function buildBrandedBasemapLayerSpecs(dayMode: boolean): BrandedBasemapLayerSpec[] {
  const p = brandedBasemapPalette(dayMode);
  const specs: BrandedBasemapLayerSpec[] = [];

  for (const layer of MAP_STREETS_LAYER_MANIFEST) {
    const { id, type } = layer;
    const lower = id.toLowerCase();

    if (type === "background") {
      specs.push({ id, kind: "background", style: { backgroundColor: p.bgColor } });
      continue;
    }

    if (type === "fill") {
      if (lower.includes("water")) {
        specs.push({ id, kind: "fill", style: { fillColor: p.waterColor } });
      } else if (lower.includes("park")) {
        specs.push({ id, kind: "fill", style: { fillColor: p.parkColor } });
      } else if (lower.includes("land") || lower.includes("landuse")) {
        specs.push({ id, kind: "fill", style: { fillColor: p.landColor } });
      }
      continue;
    }

    if (type === "line") {
      if (noiseLineId(id) || transitLineId(id)) {
        specs.push({ id, kind: "hide", sourceType: type });
      } else if (lower.includes("road")) {
        specs.push({ id, kind: "line", style: { lineColor: p.roadColor } });
      } else if (lower.includes("bridge") || lower.includes("tunnel")) {
        specs.push({ id, kind: "line", style: { lineColor: p.roadOutlineColor } });
      }
      continue;
    }

    if (type === "symbol" && lower.includes("label")) {
      if (!dayMode) {
        if (lower.startsWith("poi-") && !lower.includes("road")) {
          specs.push({ id, kind: "hide", sourceType: type });
          continue;
        }
        if (lower.includes("transit") && lower.includes("label")) {
          specs.push({ id, kind: "hide", sourceType: type });
          continue;
        }
      }
      const color =
        lower.includes("place") || lower.includes("road") ? p.labelColor : p.mutedLabelColor;
      specs.push({
        id,
        kind: "symbol",
        style: {
          textColor: color,
          textHaloColor: p.labelHaloColor,
          textHaloWidth: p.labelHaloWidth,
        },
      });
      continue;
    }

    if ((type as string) === "fill-extrusion" && lower.includes("building")) {
      specs.push({ id, kind: "hide", sourceType: type });
    }
  }

  return specs;
}

export function brandedBasemapBrandTintStyle(dayMode: boolean): Record<string, unknown> {
  const p = brandedBasemapPalette(dayMode);
  return {
    backgroundColor: "#3B66FF",
    backgroundOpacity: p.brandTintOpacity,
  };
}
