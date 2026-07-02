/**
 * Phase 6 — marketing site is the production default. Set `NEXT_PUBLIC_WEB_SITE_MODE=app` for local PWA archaeology only.
 */
export type WebSiteMode = "app" | "marketing";

export function getWebSiteMode(): WebSiteMode {
  const raw = process.env.NEXT_PUBLIC_WEB_SITE_MODE?.trim().toLowerCase();
  if (raw === "app") return "app";
  return "marketing";
}

export function isMarketingSite(): boolean {
  return getWebSiteMode() === "marketing";
}
