import { layout } from "./layout";
import { mediaLayout } from "./mediaLayout";

/**
 * Coordinated corner radii — child must be ≤ parent − border (VP-2X).
 * See docs/VP2X_EXECUTION_STABILITY_AUDIT.md
 */
export const radiusScale = {
  pill: layout.pillRadius,
  sheet: layout.cardRadius,
  control: layout.inputRadius,
  chip: layout.chipRadius,
  tabWell: 10,
  circle: (diameter: number) => diameter / 2,
  feedMedia: mediaLayout.feedMediaRadius,
  /** Nav inside checkpoint bar — must fit inside `sheet` with padding */
  checkpointNav: 18,
} as const;

/** Inset child radius for a padded parent (avoids octagonal clip). */
export function insetRadius(parentRadius: number, inset: number): number {
  return Math.max(0, parentRadius - inset);
}
