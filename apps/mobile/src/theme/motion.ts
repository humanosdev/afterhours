/** Global motion + hydration timing — single source for Core Feel Lock. */
export const motion = {
  boot: {
    /** Hub logo loading screen — minimum dwell before app shell. */
    loadingScreenMinMs: 2000,
    /** Logo bloom-in after native splash hands off. */
    logoEntranceMs: 720,
    /** Final progress bar fill once boot gates are ready. */
    progressFillCompleteMs: 480,
    /** Boot overlay dismiss — starts only after the bar + pulse finish. */
    loadingFadeOutMs: 320,
    /** Safety net if bar completion callback is missed. */
    completeFailsafeMs: 900,
  },
  fade: {
    content: 220,
    image: 200,
    avatar: 200,
    /** Skeleton overlay → content — slower than generic content fade. */
    skeletonReveal: 420,
  },
  sheet: {
    openBackdrop: 280,
    openSheet: 300,
    closeBackdrop: 220,
    closeSheet: 260,
  },
  skeleton: {
    pulse: 900,
    /** Micro placeholders (grid thumbs, etc.). */
    minDisplayMs: 180,
    /** Fitted page shells — hold long enough to block layout shake on cold open. */
    fittedMinDisplayMs: 1200,
    /** Hub/list bands — show while fetching without full-page boot hold. */
    sectionMinDisplayMs: 800,
  },
  viewer: {
    progressTickMs: 50,
    /** Photo moments — IG-ish dwell before auto-advance. */
    momentDurationMs: 7500,
  },
} as const;

export const mediaPlaceholderColor = "#141820";
