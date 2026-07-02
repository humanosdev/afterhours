/** Shared layout rhythm — mirrors web `px-4` / `sm:px-5`, tab clearance, radii. */
export const layout = {
  screenPaddingX: 16,
  screenPaddingTop: 12,
  screenPaddingBottom: 16,
  authPaddingX: 12,
  authPaddingTop: 28,
  /** Long marketing scroll (landing) — slightly tighter top rhythm vs web `AuthScreenShell`. */
  authPaddingTopScroll: 10,
  authPaddingBottom: 28,
  /** Web `max-w-2xl` — auth / marketing column (wider than in-app `contentMaxWidth`). */
  authMarketingMaxWidth: 672,
  contentMaxWidth: 448,
  /** @deprecated Use `tabBarScrollInset(insets)` from `shell/tabBarMetrics`. */
  tabBarClearance: 88,
  sectionGap: 16,
  cardGap: 12,
  /** Web `rounded-2xl` → 1.15rem ≈ 18.4 */
  cardRadius: 18,
  /** Web `rounded-xl` → 0.9rem ≈ 14.4 */
  inputRadius: 14,
  glassRadius: 18,
  chipRadius: 10,
  pillRadius: 999,
  rowPaddingY: 12,
  hubRailGap: 14,
  tabIconSize: 36,
  tabCreateSize: 40,
  searchBarHeight: 50,
  /** Web map checkpoint bar offset above tab nav (px). */
  mapNavClearance: 124,
} as const;
