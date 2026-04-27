import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type ConsentBody = {
  termsVersion: string;
  privacyVersion: string;
};

function getSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabase = getSupabase(req, res);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as ConsentBody;
  if (!body?.termsVersion || !body?.privacyVersion) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;

  const { error } = await supabase.from("legal_consents").upsert(
    {
      user_id: session.user.id,
      consent_type: "terms_privacy",
      terms_version: body.termsVersion,
      privacy_version: body.privacyVersion,
      user_agent: userAgent,
      ip_address: ipAddress,
      consented_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,consent_type,terms_version,privacy_version",
      ignoreDuplicates: true,
    }
  );

  if (error) return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
