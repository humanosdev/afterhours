import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/pushNotifyServer";

function getSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const userId = body?.userId as string | undefined;
    const notificationId = body?.notificationId as string | undefined;
    const title = body?.title as string | undefined;
    const bodyText = body?.body as string | undefined;
    const route = body?.route as string | undefined;
    const notificationType = body?.notificationType as string | undefined;
    const storyId = body?.storyId as string | undefined;

    if (!userId || !notificationId || !title || !bodyText) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    const supabase = getSupabase(req, res);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authHeader = req.headers.get("authorization");
    const bearer =
      authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;

    let actorId = session?.user?.id ?? null;
    if (!actorId && bearer) {
      const { data, error } = await supabase.auth.getUser(bearer);
      if (!error && data.user) actorId = data.user.id;
    }

    if (!actorId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const { data: notif, error: notifError } = await admin
      .from("notifications")
      .select("id, actor_user_id, recipient_user_id, created_at")
      .eq("id", notificationId)
      .maybeSingle();

    if (notifError || !notif) {
      return NextResponse.json({ ok: false, error: "notification_not_found" }, { status: 403 });
    }

    if (notif.actor_user_id !== actorId || notif.recipient_user_id !== userId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const createdAt = new Date(notif.created_at).getTime();
    if (Number.isNaN(createdAt) || Date.now() - createdAt > 5 * 60 * 1000) {
      return NextResponse.json({ ok: false, error: "notification_expired" }, { status: 403 });
    }

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
