import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FeedbackBody = {
  category?: "feature" | "bug" | "general";
  message?: string;
  subject?: string;
  source?: "native" | "web";
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function trySendFeedbackEmail(params: {
  userId: string;
  loginEmail: string;
  displayName: string;
  username: string;
  category: string;
  subjectLine: string;
  message: string;
  userAgent: string;
}): Promise<{ sent: boolean; error?: string }> {
  const toEmail = Deno.env.get("FEEDBACK_TO_EMAIL")?.trim();
  const fromEmail = Deno.env.get("FEEDBACK_FROM_EMAIL")?.trim();
  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();

  if (!toEmail || !fromEmail || !resendKey) {
    return { sent: false, error: "feedback_email_not_configured" };
  }

  const subject = `[Intencity feedback] [${params.category}] ${params.subjectLine}`;
  const text = [
    `Auth user ID: ${params.userId}`,
    `Display name: ${params.displayName}`,
    `Username: ${params.username}`,
    `Login email: ${params.loginEmail}`,
    `Category: ${params.category}`,
    `Subject: ${params.subjectLine}`,
    "",
    params.message,
    "",
    `User-Agent: ${params.userAgent}`,
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
    console.warn("Feedback email send failed:", raw);
    let error: "email_send_failed" | "email_from_domain_not_verified" = "email_send_failed";
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      const msg = typeof parsed?.message === "string" ? parsed.message : "";
      if (sendRes.status === 403 && /not verified|verify your domain/i.test(msg)) {
        error = "email_from_domain_not_verified";
      }
    } catch {
      /* ignore */
    }
    return { sent: false, error };
  }

  return { sent: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRole) {
    return json(500, { ok: false, error: "missing_env" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return json(400, { ok: false, error: "bad_request" });
  }

  const category = body?.category ?? "general";
  if (category !== "feature" && category !== "bug" && category !== "general") {
    return json(400, { ok: false, error: "bad_request" });
  }

  const message = body?.message?.trim() ?? "";
  const subjectLine = typeof body?.subject === "string" ? body.subject.trim() : "";
  const source = body?.source === "web" ? "web" : "native";

  if (!subjectLine || subjectLine.length < 3) {
    return json(400, { ok: false, error: "subject_too_short" });
  }
  if (subjectLine.length > 140) {
    return json(400, { ok: false, error: "subject_too_long" });
  }
  if (!message || message.length < 8) {
    return json(400, { ok: false, error: "message_too_short" });
  }
  if (message.length > 2000) {
    return json(400, { ok: false, error: "message_too_long" });
  }

  const { data: profile } = await userClient
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

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { data: row, error: insertError } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: user.id,
      category,
      subject: subjectLine,
      message,
      source,
      email_sent: false,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("feedback_submissions insert:", insertError?.message);
    if (/relation.*does not exist/i.test(insertError?.message ?? "")) {
      return json(500, { ok: false, error: "store_failed", detail: "run supabase db push" });
    }
    return json(500, { ok: false, error: "store_failed" });
  }

  const emailResult = await trySendFeedbackEmail({
    userId: user.id,
    loginEmail: user.email ?? "(no email on account)",
    displayName,
    username,
    category,
    subjectLine,
    message,
    userAgent: req.headers.get("user-agent") ?? "unknown",
  });

  if (emailResult.sent) {
    await admin.from("feedback_submissions").update({ email_sent: true }).eq("id", row.id);
  }

  return json(200, {
    ok: true,
    id: row.id,
    stored: true,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? null : emailResult.error ?? null,
  });
});
