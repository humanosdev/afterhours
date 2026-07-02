import { supabase } from "./supabaseClient";

export type ReportTargetType = "story" | "comment";
export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "nudity"
  | "violence"
  | "impersonation"
  | "other";

export async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin === true;
}

export async function submitContentReport(opts: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("submit_content_report", {
    p_target_type: opts.targetType,
    p_target_id: opts.targetId,
    p_reason: opts.reason,
    p_details: opts.details?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "failed" };
  }
  return { ok: true };
}

export async function adminResolveModeration(opts: {
  targetType: ReportTargetType;
  targetId: string;
  decision: "approve" | "remove";
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("admin_resolve_moderation", {
    p_target_type: opts.targetType,
    p_target_id: opts.targetId,
    p_decision: opts.decision,
  });
  if (error) return { ok: false, error: error.message };
  const payload = data as { ok?: boolean; error?: string } | null;
  return { ok: !!payload?.ok, error: payload?.error };
}
