import { NextRequest, NextResponse } from "next/server";
import {
  accessCookieName,
  accessTokenForPassword,
  getMarketingSitePassword,
  isMarketingSiteAccessRequired,
} from "@/lib/siteAccess";

export async function POST(req: NextRequest) {
  if (!isMarketingSiteAccessRequired()) {
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const expected = getMarketingSitePassword();

  if (!expected || password !== expected) {
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const token = await accessTokenForPassword(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(accessCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
