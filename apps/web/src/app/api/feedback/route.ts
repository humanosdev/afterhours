import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type FeedbackBody = {
  category: "feature" | "bug" | "general";
  message: string;
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

  const body = (await req.json()) as FeedbackBody;
  const category = body?.category ?? "general";
  const message = body?.message?.trim() ?? "";

  if (!message || message.length < 8) {
    return NextResponse.json({ ok: false, error: "message_too_short" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ ok: false, error: "message_too_long" }, { status: 400 });
  }

  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (!toEmail || !fromEmail || !resendKey) {
    return NextResponse.json({ ok: false, error: "feedback_email_not_configured" }, { status: 500 });
  }

  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const submittedBy = session.user.email ?? session.user.id;
  const subject = `[Intencity feedback] ${category}`;
  const text = [
    `Submitted by: ${submittedBy}`,
    `User ID: ${session.user.id}`,
    `Category: ${category}`,
    "",
    message,
    "",
    `User-Agent: ${userAgent}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      text,
    }),
  });

  if (!sendRes.ok) {
    const raw = await sendRes.text();
    console.error("Feedback email send failed:", raw);
    return NextResponse.json({ ok: false, error: "email_send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
