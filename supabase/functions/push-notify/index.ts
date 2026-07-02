import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const EXPO_ENDPOINT_PREFIX = "expo:";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const STORY_ENGAGEMENT_PUSH_MAX_DISTINCT_ACTORS = 4;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushBody = {
  userId?: string;
  title?: string;
  body?: string;
  route?: string;
  notificationType?: string;
  storyId?: string | null;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseClockToMinutes(raw: string | null | undefined): number | null {
  const s = raw?.trim();
  if (!s) return null;
  const parts = s.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

function isWithinQuietHours(
  quietStart: string | null | undefined,
  quietEnd: string | null | undefined,
  now = new Date()
): boolean {
  const startM = parseClockToMinutes(quietStart);
  const endM = parseClockToMinutes(quietEnd);
  if (startM == null || endM == null || startM === endM) return false;
  const nowM = now.getHours() * 60 + now.getMinutes();
  if (startM < endM) return nowM >= startM && nowM < endM;
  return nowM >= startM || nowM < endM;
}

function isExpoPushEndpoint(endpoint: string): boolean {
  return endpoint.startsWith(EXPO_ENDPOINT_PREFIX);
}

function expoTokenFromEndpoint(endpoint: string): string | null {
  if (!isExpoPushEndpoint(endpoint)) return null;
  const token = endpoint.slice(EXPO_ENDPOINT_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

async function countDistinctStoryEngagementActors(
  admin: SupabaseClient,
  recipientId: string,
  storyId: string,
  type: string
): Promise<number> {
  const { data, error } = await admin
    .from("notifications")
    .select("actor_user_id")
    .eq("recipient_user_id", recipientId)
    .eq("story_id", storyId)
    .eq("type", type);
  if (error) return 0;
  return new Set((data ?? []).map((r) => r.actor_user_id)).size;
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  route: string
): Promise<number> {
  if (tokens.length === 0) return 0;
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN")?.trim();
  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    data: { route },
    sound: "default",
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.warn("expo push failed:", await res.text());
    return 0;
  }

  const payload = (await res.json()) as { data?: Array<{ status?: string }> };
  return (payload.data ?? []).filter((t) => t.status === "ok").length;
}

async function sendWebPush(
  rows: PushRow[],
  payload: string
): Promise<number> {
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject =
    Deno.env.get("VAPID_SUBJECT") ??
    `mailto:${Deno.env.get("FEEDBACK_TO_EMAIL") ?? "support@getintencity.com"}`;

  if (!vapidPublic || !vapidPrivate || rows.length === 0) return 0;

  const webpush = await import("npm:web-push@3.6.7");
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload
      );
      sent += 1;
    } catch {
      /* per-subscription */
    }
  }
  return sent;
}

async function sendPushToUser(
  admin: SupabaseClient,
  params: Required<Pick<PushBody, "userId" | "title" | "body">> & PushBody
): Promise<{ ok: boolean; sent: number; skipped?: string; error?: string }> {
  const route = params.route ?? "/notifications";

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("push_enabled, quiet_hours_start, quiet_hours_end")
    .eq("user_id", params.userId)
    .maybeSingle();

  if ((prefs?.push_enabled ?? true) === false) {
    return { ok: true, sent: 0, skipped: "push_disabled" };
  }

  if (isWithinQuietHours(prefs?.quiet_hours_start, prefs?.quiet_hours_end)) {
    return { ok: true, sent: 0, skipped: "quiet_hours" };
  }

  if (
    params.storyId &&
    (params.notificationType === "story_like" || params.notificationType === "story_comment")
  ) {
    const distinctActors = await countDistinctStoryEngagementActors(
      admin,
      params.userId,
      params.storyId,
      params.notificationType
    );
    if (distinctActors >= STORY_ENGAGEMENT_PUSH_MAX_DISTINCT_ACTORS) {
      return { ok: true, sent: 0, skipped: "story_engagement_grouped" };
    }
  }

  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", params.userId);

  if (error) {
    return { ok: false, sent: 0, error: "subscriptions_fetch_failed" };
  }

  const subscriptions = (rows ?? []) as PushRow[];
  if (subscriptions.length === 0) {
    return { ok: true, sent: 0 };
  }

  const payload = JSON.stringify({ title: params.title, body: params.body, route });
  const webRows = subscriptions.filter((r) => !isExpoPushEndpoint(r.endpoint));
  const expoTokens = subscriptions
    .map((r) => expoTokenFromEndpoint(r.endpoint))
    .filter((t): t is string => Boolean(t));

  const [webSent, expoSent] = await Promise.all([
    sendWebPush(webRows, payload),
    sendExpoPush(expoTokens, params.title, params.body, route),
  ]);

  return { ok: true, sent: webSent + expoSent };
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

  let body: PushBody;
  try {
    body = (await req.json()) as PushBody;
  } catch {
    return json(400, { ok: false, error: "bad_request" });
  }

  if (!body.userId || !body.title || !body.body) {
    return json(400, { ok: false, error: "bad_request" });
  }

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  try {
    const result = await sendPushToUser(admin, {
      userId: body.userId,
      title: body.title,
      body: body.body,
      route: body.route,
      notificationType: body.notificationType,
      storyId: body.storyId ?? null,
    });

    if (!result.ok) {
      return json(500, { ok: false, error: result.error ?? "push_send_failed" });
    }

    return json(200, { ok: true, sent: result.sent, skipped: result.skipped ?? null });
  } catch (e) {
    console.error("push-notify:", e);
    return json(500, { ok: false, error: "push_send_failed" });
  }
});
