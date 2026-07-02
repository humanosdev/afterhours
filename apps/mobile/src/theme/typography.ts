import { colors } from "./colors";

/** PWA-aligned type scale — mobile-only. */
export const typography = {
  authTitle: {
    fontSize: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.4,
    color: colors.textPrimary,
    textAlign: "center" as const,
  },
  subpageTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    letterSpacing: -0.35,
    color: colors.textPrimary,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.25,
    color: colors.textPrimary,
  },
  screenTitleLarge: {
    fontSize: 20,
    fontWeight: "600" as const,
    letterSpacing: -0.35,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    letterSpacing: 0.4,
    color: colors.textPrimary,
    textTransform: "uppercase" as const,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: "500" as const,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 17,
    color: colors.textWhite42,
  },
  micro: {
    fontSize: 11,
    fontWeight: "400" as const,
    lineHeight: 15,
    color: colors.textMuted,
  },
  legal: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center" as const,
  },
  link: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.accent,
  },
  devRibbon: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.6,
    color: colors.accentActive,
    textTransform: "uppercase" as const,
  },
} as const;
