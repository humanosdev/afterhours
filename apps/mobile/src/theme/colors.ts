/** Mirrors apps/web `globals.css` Intencity tokens (charcoal + electric blue). */
export const colors = {
  bgPrimary: "#0a0c18",
  /** Deep map-like panel (between primary and secondary — PWA map canvas feel). */
  bgLift: "#0d1019",
  bgSecondary: "#12151b",
  surface: "#1b2028",
  surfaceHover: "#232a35",
  /** PWA `--ah-border-subtle` */
  borderSubtle: "rgba(255, 255, 255, 0.065)",
  /** PWA `.ah-glass-control` chrome */
  glassBorder: "rgba(255, 255, 255, 0.1)",
  borderFocus: "rgba(59, 102, 255, 0.55)",
  divider: "rgba(255, 255, 255, 0.08)",

  textPrimary: "#f5f3ef",
  textSecondary: "#a8b0bf",
  textMuted: "#737d8f",
  /** PWA white/42, white/55, white/85 for hub chrome / empty states */
  textWhite42: "rgba(255, 255, 255, 0.42)",
  textWhite55: "rgba(255, 255, 255, 0.55)",
  textWhite78: "rgba(255, 255, 255, 0.78)",
  textWhite85: "rgba(255, 255, 255, 0.85)",

  accent: "#3b66ff",
  accentActive: "#5b82ff",
  accentGlow: "rgba(59, 102, 255, 0.22)",
  /** PWA `--ah-accent-brand-muted` */
  accentBrandMuted: "rgba(59, 102, 255, 0.26)",
  accentMint: "#5eead4",

  danger: "#ff6b7a",
  dangerMuted: "rgba(255, 107, 122, 0.12)",
} as const;
