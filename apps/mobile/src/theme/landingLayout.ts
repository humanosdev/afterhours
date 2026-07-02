import { Dimensions } from "react-native";

/** Standard iPhones — viewport-fit without scroll. */
export const LANDING_COMPACT_HEIGHT = 780;
/** iPhone SE / mini — allow overflow scroll + tighter rhythm. */
export const LANDING_TIGHT_HEIGHT = 700;

export function isCompactLandingViewport(windowHeight = Dimensions.get("window").height) {
  return windowHeight < LANDING_COMPACT_HEIGHT;
}

export function isTightLandingViewport(windowHeight = Dimensions.get("window").height) {
  return windowHeight < LANDING_TIGHT_HEIGHT;
}

/** Vertical rhythm — `fit` = no scroll on iPhone 15-class; `compact` / `tight` = progressive compression. */
export function landingSpacing(windowHeight = Dimensions.get("window").height) {
  if (isTightLandingViewport(windowHeight)) {
    return {
      heroMarginBottom: 10,
      lockupMarginBottom: 4,
      featuresGap: 6,
      featuresMarginBottom: 10,
      ctaMarginBottom: 8,
      buttonsMarginBottom: 8,
      legalMarginTop: 6,
    } as const;
  }

  if (isCompactLandingViewport(windowHeight)) {
    return {
      heroMarginBottom: 12,
      lockupMarginBottom: 4,
      featuresGap: 7,
      featuresMarginBottom: 12,
      ctaMarginBottom: 10,
      buttonsMarginBottom: 10,
      legalMarginTop: 8,
    } as const;
  }

  return {
    heroMarginBottom: 14,
    lockupMarginBottom: 4,
    featuresGap: 8,
    featuresMarginBottom: 14,
    ctaMarginBottom: 10,
    buttonsMarginBottom: 10,
    legalMarginTop: 8,
  } as const;
}
