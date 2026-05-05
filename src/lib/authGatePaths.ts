/**
 * Paths that require a Supabase session — mirrors `middleware.ts`.
 * Used by AppShell to hide the tab bar until the client knows there is a session.
 */
export const AUTH_GATE_PATH_PREFIXES = [
  "/hub",
  "/map",
  "/chat",
  "/profile",
  "/settings",
  "/archive",
  "/live-places",
  "/shares",
  "/onboarding",
  "/notifications",
  "/moments",
  "/u",
  "/venue-activity",
  "/stories",
] as const;

export function matchesAuthGatePath(pathname: string): boolean {
  return AUTH_GATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
