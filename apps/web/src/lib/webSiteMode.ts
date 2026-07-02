/**
 * Era 2 cutover toggle — marketing site vs full PWA app.
 * Set `NEXT_PUBLIC_WEB_SITE_MODE=marketing` to block auth/product routes without deleting PWA logic.
 */
export type WebSiteMode = "app" | "marketing";

export function getWebSiteMode(): WebSiteMode {
  return process.env.NEXT_PUBLIC_WEB_SITE_MODE === "marketing" ? "marketing" : "app";
}

export function isMarketingSite(): boolean {
  return getWebSiteMode() === "marketing";
}
