const ACCESS_COOKIE = "intencity_marketing_access";

function stripEnvValue(raw: string | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || null;
}

function readPasswordEnv(): string | null {
  const candidates = [
    process.env.MARKETING_SITE_PASSWORD,
    process.env.SITE_PASSWORD,
    process.env.SITE_ACCESS_PASSWORD,
  ];
  for (const raw of candidates) {
    const pw = stripEnvValue(raw);
    if (pw) return pw;
  }
  return null;
}

export function getMarketingSitePassword(): string | null {
  return readPasswordEnv();
}

/** Non-sensitive token for Edge middleware when password is marked Sensitive on Vercel. */
export function getMarketingSiteAccessToken(): string | null {
  return stripEnvValue(process.env.MARKETING_SITE_ACCESS_TOKEN);
}

export function isMarketingSiteAccessRequired(): boolean {
  return Boolean(getMarketingSitePassword() || getMarketingSiteAccessToken());
}

export function accessCookieValueForLogin(): string | null {
  const password = getMarketingSitePassword();
  if (!password) return getMarketingSiteAccessToken();
  return getMarketingSiteAccessToken() ?? accessTokenForPassword(password);
}

export function accessCookieName(): string {
  return ACCESS_COOKIE;
}

/** Sync token — same in middleware (Edge) and server actions (Node). */
export function accessTokenForPassword(password: string): string {
  const salt =
    stripEnvValue(process.env.MARKETING_SITE_ACCESS_SECRET) ?? "intencity-marketing-gate";
  const payload = `${salt}:${password}`;
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i);
  }
  return `ah_${(hash >>> 0).toString(16)}_${payload.length}`;
}

export function expectedAccessToken(): string | null {
  const password = getMarketingSitePassword();
  if (!password) return null;
  return accessTokenForPassword(password);
}

export function verifySiteAccessPassword(input: string): boolean {
  const expected = getMarketingSitePassword();
  if (!expected) return false;
  return input.trim() === expected;
}

/** Optional Basic Auth header (browser prompt) using the same password. */
export function hasValidMarketingBasicAuth(authHeader: string | null): boolean {
  const expected = getMarketingSitePassword();
  if (!expected || !authHeader?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authHeader.slice(6));
    const colon = decoded.indexOf(":");
    const pass = colon >= 0 ? decoded.slice(colon + 1) : decoded;
    return pass.trim() === expected;
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function hasValidMarketingAccessCookie(cookieValue: string | undefined): boolean {
  if (!isMarketingSiteAccessRequired()) return true;
  if (!cookieValue) return false;

  const accessToken = getMarketingSiteAccessToken();
  if (accessToken) {
    return timingSafeEqual(cookieValue, accessToken);
  }

  const expected = expectedAccessToken();
  if (!expected) return false;
  return timingSafeEqual(cookieValue, expected);
}

export function isStaticAssetPath(pathname: string): boolean {
  return /\.(?:ico|png|jpe?g|gif|webp|svg|json|txt|xml|webmanifest|js|css|map|woff2?)$/i.test(
    pathname
  );
}

export function isMarketingApiPath(pathname: string): boolean {
  return (
    pathname === "/api/site-access" ||
    pathname === "/api/waitlist" ||
    pathname.startsWith("/api/site-access/") ||
    pathname.startsWith("/api/waitlist/")
  );
}

export function isSiteAccessExemptPath(pathname: string): boolean {
  return (
    pathname === "/site-access" ||
    pathname.startsWith("/site-access/") ||
    isStaticAssetPath(pathname) ||
    isMarketingApiPath(pathname)
  );
}

export function siteAccessCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
