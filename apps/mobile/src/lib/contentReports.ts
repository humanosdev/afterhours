import { supabase } from "./supabase/client";

export type ReportTargetType = "story" | "comment";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "nudity"
  | "violence"
  | "impersonation"
  | "other";

export type ReportReasonOption = {
  id: ReportReason;
  label: string;
  hint: string;
};

/** Report flow — reason chips + optional details (no AI in v1). */
export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  { id: "spam", label: "Spam", hint: "Misleading or repetitive promotion" },
  { id: "harassment", label: "Harassment or bullying", hint: "Targeting someone to hurt or intimidate" },
  { id: "hate", label: "Hate or symbols", hint: "Attacks based on identity or protected groups" },
  { id: "nudity", label: "Nudity or sexual content", hint: "Inappropriate sexual material" },
  { id: "violence", label: "Violence or dangerous acts", hint: "Threats, injury, or dangerous behavior" },
  { id: "impersonation", label: "Impersonation", hint: "Pretending to be someone else" },
  { id: "other", label: "Something else", hint: "Add a short note below" },
];

export type SubmitReportResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

export async function submitContentReport(opts: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<SubmitReportResult> {
  const { data, error } = await supabase.rpc("submit_content_report", {
    p_target_type: opts.targetType,
    p_target_id: opts.targetId,
    p_reason: opts.reason,
    p_details: opts.details?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    const code = payload?.error ?? "unknown";
    const message =
      code === "already_reported"
        ? "You already reported this."
        : code === "cannot_report_own_content"
          ? "You can't report your own content."
          : code === "blocked"
            ? "You can't report this user right now."
            : code === "target_not_found"
              ? "This content is no longer available."
              : "Could not send report. Try again.";
    return { ok: false, error: message, code };
  }

  return { ok: true };
}

export type AdminModerationDecision = "approve" | "remove";

export async function adminResolveModeration(opts: {
  targetType: ReportTargetType;
  targetId: string;
  decision: AdminModerationDecision;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("admin_resolve_moderation", {
    p_target_type: opts.targetType,
    p_target_id: opts.targetId,
    p_decision: opts.decision,
  });

  if (error) return { ok: false, error: error.message };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "forbidden" };
  }
  return { ok: true };
}

export type ContentReportRow = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details: string | null;
  created_at: string;
};

export async function fetchReportsForTarget(
  targetType: ReportTargetType,
  targetId: string
): Promise<ContentReportRow[]> {
  const { data, error } = await supabase
    .from("content_reports")
    .select("id, reporter_id, target_type, target_id, reason, details, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as ContentReportRow[];
}

async function fetchMyReportedTargetIds(targetType: ReportTargetType): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from("content_reports")
    .select("target_id")
    .eq("target_type", targetType)
    .eq("reporter_id", user.id);

  if (error || !data) return [];
  return data.map((row) => String(row.target_id));
}

/** Story ids the signed-in user has reported — personal hide persists after admin review. */
export async function fetchMyReportedStoryIds(): Promise<string[]> {
  return fetchMyReportedTargetIds("story");
}

/** Comment ids the signed-in user has reported — hidden locally for the reporter only. */
export async function fetchMyReportedCommentIds(): Promise<string[]> {
  return fetchMyReportedTargetIds("comment");
}
