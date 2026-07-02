import { memo, useMemo } from "react";
import {
  brandedBasemapBrandTintStyle,
  buildBrandedBasemapLayerSpecs,
  MAP_BRAND_TINT_LAYER,
  type BrandedBasemapLayerSpec,
} from "../../lib/mapBrandedBasemap";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LayerComponent = React.ComponentType<any>;

type MapboxLayerComponents = {
  BackgroundLayer: LayerComponent;
  FillLayer: LayerComponent;
  LineLayer: LayerComponent;
  SymbolLayer: LayerComponent;
  FillExtrusionLayer?: LayerComponent;
};

function HideLayer({
  spec,
  layers,
}: {
  spec: BrandedBasemapLayerSpec;
  layers: MapboxLayerComponents;
}) {
  const hideStyle = { visibility: "none" as const };
  const t = spec.sourceType ?? "line";
  const { FillLayer, LineLayer, SymbolLayer, FillExtrusionLayer } = layers;
  if (t === "symbol") {
    return <SymbolLayer id={spec.id} existing style={hideStyle} />;
  }
  if (t === "fill-extrusion" && FillExtrusionLayer) {
    return <FillExtrusionLayer id={spec.id} existing style={hideStyle} />;
  }
  if (t === "fill") {
    return <FillLayer id={spec.id} existing style={hideStyle} />;
  }
  return <LineLayer id={spec.id} existing style={hideStyle} />;
}

type MapBrandedBasemapLayersProps = {
  dayMode: boolean;
  layers: MapboxLayerComponents;
};

/**
 * Recolors Mapbox dark-v11 / light-v11 to match PWA navy basemap (roads, labels, land).
 * Render as first children inside MapView so Intencity overlays stay on top.
 */
export const MapBrandedBasemapLayers = memo(function MapBrandedBasemapLayers({
  dayMode,
  layers,
}: MapBrandedBasemapLayersProps) {
  const { BackgroundLayer, FillLayer, LineLayer, SymbolLayer } = layers;
  const specs = useMemo(() => buildBrandedBasemapLayerSpecs(dayMode), [dayMode]);
  const brandTintStyle = useMemo(() => brandedBasemapBrandTintStyle(dayMode), [dayMode]);

  return (
    <>
      <BackgroundLayer id={MAP_BRAND_TINT_LAYER} style={brandTintStyle} />
      {specs.map((spec) => {
        if (spec.kind === "hide") {
          return <HideLayer key={`hide-${spec.id}`} spec={spec} layers={layers} />;
        }
        if (spec.kind === "background") {
          return <BackgroundLayer key={spec.id} id={spec.id} existing style={spec.style} />;
        }
        if (spec.kind === "fill") {
          return <FillLayer key={spec.id} id={spec.id} existing style={spec.style} />;
        }
        if (spec.kind === "line") {
          return <LineLayer key={spec.id} id={spec.id} existing style={spec.style} />;
        }
        return <SymbolLayer key={spec.id} id={spec.id} existing style={spec.style} />;
      })}
    </>
  );
});
