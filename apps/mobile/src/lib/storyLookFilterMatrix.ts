import type { Matrix } from "react-native-color-matrix-image-filters";
import type { StoryLookFilterId } from "./storyLookFilters";

/** 4×5 color matrices — tuned for Intencity (subtle, not IG-purple). */
export function storyLookFilterMatrix(id: StoryLookFilterId): Matrix | null {
  switch (id) {
    case "none":
      return null;
    case "warm":
      return [1.08, 0.05, 0, 0, 12, 0.02, 1.02, 0, 0, 6, 0, 0, 0.94, 0, 0, 0, 0, 0, 1, 0] as Matrix;
    case "cool":
      return [0.96, 0, 0.04, 0, 0, 0, 1.02, 0.06, 0, 4, 0.02, 0.04, 1.1, 0, 8, 0, 0, 0, 1, 0] as Matrix;
    case "vivid":
      return [
        1.18, -0.04, -0.04, 0, 0, -0.02, 1.14, -0.02, 0, 0, -0.04, -0.02, 1.16, 0, 0, 0, 0, 0, 1, 0,
      ] as Matrix;
    case "mono":
      return [0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0, 0, 0, 1, 0] as Matrix;
    case "fade":
      return [0.92, 0.04, 0.04, 0, 14, 0.04, 0.9, 0.04, 0, 14, 0.04, 0.04, 0.88, 0, 14, 0, 0, 0, 1, 0] as Matrix;
    default:
      return null;
  }
}
