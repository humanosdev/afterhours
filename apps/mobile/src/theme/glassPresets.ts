type GlassPresetRecipe = {
  blur: number;
  tint: number;
  intense: boolean;
  /** Expo BlurView intensity when it must visually match CSS `backdrop-filter: blur(Npx)`. */
  blurIntensity?: number;
};

/**
 * Unified glass — web `.ah-glass-control` (`bg-primary/72`, blur 24px, border white/10).
 * `control` and `bar` share the same frost recipe (tab bar is the reference implementation).
 */
export const glassPresets: Record<"control" | "bar" | "panel" | "flat", GlassPresetRecipe> = {
  control: { blur: 24, tint: 0.72, intense: false, blurIntensity: 50 },
  bar: { blur: 24, tint: 0.72, intense: false, blurIntensity: 50 },
  panel: { blur: 32, tint: 0.76, intense: true, blurIntensity: 56 },
  flat: { blur: 0, tint: 0.72, intense: false },
};
