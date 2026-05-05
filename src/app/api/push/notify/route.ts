import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const userId = body?.userId as string | undefined;
    const title = body?.title as string | undefined;
    const bodyText = body?.body as string | undefined;
    const route = body?.route as string | undefined;

    if (!userId || !title || !bodyText) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:support@intencity.co";

    if (!supabaseUrl || !serviceRole || !vapidPublic || !vapidPrivate) {
      return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const { data: rows, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ ok: false, error: "subscriptions_fetch_failed" }, { status: 500 });
    }

    const payload = JSON.stringify({
      title,
      body: bodyText,
      route: route ?? "/notifications",
    });

    const subscriptions = (rows ?? []) as PushRow[];
    if (subscriptions.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    let sent = 0;
    for (const row of subscriptions) {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch {
        // swallow per-subscription errors to keep fanout resilient
      }
    }
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ ok: false, error: "push_send_failed" }, { status: 500 });
  }
}
