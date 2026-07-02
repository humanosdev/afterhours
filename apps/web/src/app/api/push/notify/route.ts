import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/pushNotifyServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const userId = body?.userId as string | undefined;
    const title = body?.title as string | undefined;
    const bodyText = body?.body as string | undefined;
    const route = body?.route as string | undefined;
    const notificationType = body?.notificationType as string | undefined;
    const storyId = body?.storyId as string | undefined;

    if (!userId || !title || !bodyText) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const result = await sendPushToUser(admin, {
      userId,
      title,
      body: bodyText,
      route,
      notificationType,
      storyId: storyId ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "push_send_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sent: result.sent, skipped: result.skipped ?? null });
  } catch {
    return NextResponse.json({ ok: false, error: "push_send_failed" }, { status: 500 });
  }
}
