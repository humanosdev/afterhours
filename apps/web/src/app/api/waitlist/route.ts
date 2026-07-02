import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

function normalizePhone(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return null;
  const phone = raw.trim();
  if (phone.length < 7 || phone.length > 32) return null;
  return phone;
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const name = normalizeName(body?.name);
  const email = normalizeEmail(body?.email);
  const phone = normalizePhone(body?.phone);

  if (!name) {
    return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await admin.from("marketing_waitlist").insert({
    name,
    email,
    phone,
    city: "Philadelphia",
    launch_market: "philadelphia",
    source: "marketing_site",
    user_agent: userAgent,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[waitlist]", error.message);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
