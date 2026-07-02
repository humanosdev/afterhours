/**
 * Routes reachable when `NEXT_PUBLIC_WEB_SITE_MODE=marketing`.
 * Everything else redirects to `/`.
 */
export const PUBLIC_SITE_PATHS = [
  "/",
  "/terms",
  "/privacy",
  "/guidelines",
  "/contact",
] as const;

export const PUBLIC_SITE_PATH_PREFIXES = PUBLIC_SITE_PATHS;

/** Auth and product routes blocked in marketing mode (redirect → `/`). */
export const MARKETING_BLOCKED_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/hub",
  "/map",
  "/chat",
  "/profile",
  "/settings",
  "/archive",
  "/live-places",
  "/shares",
  "/notifications",
  "/moments",
  "/u",
  "/venue-activity",
  "/stories",
  "/search",
  "/admin",
] as const;

export function isPublicSitePath(pathname: string): boolean {
  return PUBLIC_SITE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isMarketingBlockedPath(pathname: string): boolean {
  return MARKETING_BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
