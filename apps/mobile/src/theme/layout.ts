/** Shared layout rhythm — aligned with web/PWA density (`px-4` / `sm:px-5` ≈ 16–20). */
export const layout = {
  screenPaddingX: 18,
  screenPaddingTop: 6,
  screenPaddingBottom: 14,
  tabBarClearance: 80,
  sectionGap: 16,
  cardGap: 10,
  /** Web venue / cards often `rounded-2xl` (16). */
  cardRadius: 16,
  glassRadius: 18,
  rowPaddingY: 10,
  /** Hub horizontal story strip spacing (web gap-[14px]). */
  hubRailGap: 14,
} as const;
