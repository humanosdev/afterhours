export const appConfig = {
  appName: "Intencity",
  description: "See where your friends are going out in real time.",
  /** Account issues, bugs, and in-app support */
  supportEmail: "Support@getintencity.com",
  /** General questions about policies or the product */
  contactEmail: "Contact@getintencity.com",
  /** Venues, brands, and commercial partnerships */
  partnershipsEmail: "Partnerships@getintencity.com",
  /** App Store listing — set via env when live */
  iosAppStoreUrl: process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "",
  /** Google Play listing — set via env when live */
  androidPlayStoreUrl: process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL ?? "",
  minimumAge: 18,
  termsVersion: "2026-04-26",
  privacyVersion: "2026-04-26",
} as const;
