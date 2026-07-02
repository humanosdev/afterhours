import { NextRequest, NextResponse } from "next/server";
import {
  accessCookieName,
  accessCookieValueForLogin,
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

  const cookieValue = accessCookieValueForLogin();
  if (!cookieValue) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const secure =
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https" ||
    process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(accessCookieName(), cookieValue, siteAccessCookieOptions(secure));
  return res;
}
