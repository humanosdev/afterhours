import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coalesceOverlappingVenueActivityFeatures,
  venueActivityCoordinateKey,
} from "./coalesceVenueActivityFeatures";

describe("coalesceOverlappingVenueActivityFeatures", () => {
  it("groups venues at the same coordinate into one glow feature", () => {
    const features = coalesceOverlappingVenueActivityFeatures([
      {
        type: "Feature",
        id: "a",
        properties: { combined_count: 3, inside_count: 2, nearby_count: 1, heat_color: "#2F5EFF" },
        geometry: { type: "Point", coordinates: [-75.16, 39.95] },
      },
      {
        type: "Feature",
        id: "b",
        properties: { combined_count: 9, inside_count: 5, nearby_count: 4, heat_color: "#FF2DBE" },
        geometry: { type: "Point", coordinates: [-75.16, 39.95] },
      },
    ]);

    assert.equal(features.length, 1);
    assert.equal(features[0]?.properties.combined_count, 9);
    assert.equal(features[0]?.properties.inside_count, 5);
    assert.equal(features[0]?.properties.nearby_count, 4);
    assert.equal(features[0]?.properties.heat_color, "#FF2DBE");
    assert.equal(features[0]?.id, "b");
  });

  it("leaves distinct coordinates untouched", () => {
    const features = coalesceOverlappingVenueActivityFeatures([
      {
        type: "Feature",
        properties: { combined_count: 1 },
        geometry: { type: "Point", coordinates: [-75.16, 39.95] },
      },
      {
        type: "Feature",
        properties: { combined_count: 2 },
        geometry: { type: "Point", coordinates: [-75.17, 39.96] },
      },
    ]);

    assert.equal(features.length, 2);
  });

  it("venueActivityCoordinateKey rounds to five decimals", () => {
    assert.equal(venueActivityCoordinateKey(-75.163612, 39.952601), "-75.16361:39.95260");
  });
});
