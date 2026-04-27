import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

type Body = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
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

  const body = (await req.json()) as Body;
  if (!body?.userId || !body?.title || !body?.body) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:humanosdev@gmail.com";
  if (!publicKey || !privateKey) {
    return NextResponse.json({ ok: false, error: "missing_vapid" }, { status: 200 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "missing_service_role" }, { status: 200 });
  }
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", body.userId);

  const subs = rows ?? [];
  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: body.title,
            body: body.body,
            data: body.data ?? {},
          })
        );
      } catch {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    })
  );

  return NextResponse.json({ ok: true });
}
