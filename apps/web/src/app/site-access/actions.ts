"use server";

import { cookies, headers } from "next/headers";
import {
  accessCookieName,
  accessTokenForPassword,
  getMarketingSitePassword,
  isMarketingSiteAccessRequired,
  siteAccessCookieOptions,
  verifySiteAccessPassword,
} from "@/lib/siteAccess";

export async function submitSiteAccessPassword(
  password: string
): Promise<{ ok: true } | { ok: false; error: "not_configured" | "invalid_password" }> {
  if (!isMarketingSiteAccessRequired()) {
    return { ok: false, error: "not_configured" };
  }

  if (!verifySiteAccessPassword(password)) {
    return { ok: false, error: "invalid_password" };
  }

  const expected = getMarketingSitePassword();
  if (!expected) {
    return { ok: false, error: "not_configured" };
  }

  const proto = headers().get("x-forwarded-proto");
  const secure = proto === "https" || process.env.NODE_ENV === "production";

  cookies().set(
    accessCookieName(),
    accessTokenForPassword(expected),
    siteAccessCookieOptions(secure)
  );

  return { ok: true };
}
