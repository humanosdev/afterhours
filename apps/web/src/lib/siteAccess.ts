const ACCESS_COOKIE = "intencity_marketing_access";

export function getMarketingSitePassword(): string | null {
  const pw = process.env.MARKETING_SITE_PASSWORD?.trim();
  return pw || null;
}

export function isMarketingSiteAccessRequired(): boolean {
  return Boolean(getMarketingSitePassword());
}

export function accessCookieName(): string {
  return ACCESS_COOKIE;
}

/** Deterministic token stored in httpOnly cookie after successful gate login. */
export async function accessTokenForPassword(password: string): Promise<string> {
  const salt = process.env.MARKETING_SITE_ACCESS_SECRET?.trim() ?? "intencity-marketing-gate";
  const payload = `${salt}:${password}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedAccessToken(): Promise<string | null> {
  const password = getMarketingSitePassword();
  if (!password) return null;
  return accessTokenForPassword(password);
}

export async function hasValidMarketingAccessCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await expectedAccessToken();
  if (!expected) return true;
  if (cookieValue.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= cookieValue.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isStaticAssetPath(pathname: string): boolean {
  return /\.(?:ico|png|jpe?g|gif|webp|svg|json|txt|xml|webmanifest|js|css|map|woff2?)$/i.test(
    pathname
  );
}
