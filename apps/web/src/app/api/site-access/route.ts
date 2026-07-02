import { NextRequest, NextResponse } from "next/server";
import {
  accessCookieName,
  accessTokenForPassword,
  getMarketingSitePassword,
  isMarketingSiteAccessRequired,
  siteAccessCookieOptions,
  verifySiteAccessPassword,
} from "@/lib/siteAccess";

export async function POST(req: NextRequest) {
  if (!isMarketingSiteAccessRequired()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!verifySiteAccessPassword(password)) {
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const expected = getMarketingSitePassword();
  if (!expected) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const secure =
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https" ||
    process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    accessCookieName(),
    accessTokenForPassword(expected),
    siteAccessCookieOptions(secure)
  );
  return res;
}
