import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type FeedbackBody = {
  category: "feature" | "bug" | "general";
  message: string;
  subject: string;
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
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as FeedbackBody;
  const category = body?.category ?? "general";
  const message = body?.message?.trim() ?? "";
  const subjectLine = typeof body?.subject === "string" ? body.subject.trim() : "";

  if (!subjectLine || subjectLine.length < 3) {
    return NextResponse.json({ ok: false, error: "subject_too_short" }, { status: 400 });
  }
  if (subjectLine.length > 140) {
    return NextResponse.json({ ok: false, error: "subject_too_long" }, { status: 400 });
  }
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    typeof profile?.display_name === "string" && profile.display_name.trim()
      ? profile.display_name.trim()
      : "(not set)";
  const username =
    typeof profile?.username === "string" && profile.username.trim()
      ? profile.username.trim()
      : "(not set)";

  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const loginEmail = user.email ?? "(no email on account)";
  const subject = `[Intencity feedback] [${category}] ${subjectLine}`;
  const text = [
    `Auth user ID: ${user.id}`,
    `Display name: ${displayName}`,
    `Username: ${username}`,
    `Login email: ${loginEmail}`,
    `Category: ${category}`,
    `Subject: ${subjectLine}`,
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
    let error: "email_send_failed" | "email_from_domain_not_verified" = "email_send_failed";
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      const msg = typeof parsed?.message === "string" ? parsed.message : "";
      if (sendRes.status === 403 && /not verified|verify your domain/i.test(msg)) {
        error = "email_from_domain_not_verified";
      }
    } catch {
      /* ignore non-JSON body */
    }
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
