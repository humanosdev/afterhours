import { FunctionsHttpError } from "@supabase/supabase-js";
import { isNetworkRequestFailed } from "./networkErrors";
import { supabase } from "./supabase/client";

export type FeedbackCategory = "feature" | "bug" | "general";

export type SubmitFeedbackInput = {
  category: FeedbackCategory;
  subject: string;
  message: string;
};

export type SubmitFeedbackResult =
  | { ok: true; emailSent?: boolean }
  | { ok: false; error: string; message: string };

type FeedbackResponse = {
  ok?: boolean;
  error?: string;
  stored?: boolean;
  emailSent?: boolean;
  emailError?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sign in again to send feedback.",
  subject_too_short: "Please adjust the subject length and try again.",
  subject_too_long: "Please adjust the subject length and try again.",
  message_too_short: "Please write at least a short description.",
  message_too_long: "Message is too long. Keep it under 2000 characters.",
  feedback_email_not_configured:
    "Feedback is saved in the app but email is not configured on the server. Contact support@getintencity.com directly.",
  email_from_domain_not_verified:
    "Feedback was saved. Email delivery is misconfigured on the server (Resend domain).",
  email_send_failed: "Feedback was saved. Email could not send right now.",
  store_failed: "Could not save feedback. Check your connection and try again.",
  function_not_found:
    "Feedback service is not deployed yet. From the repo root run: supabase functions deploy feedback",
  network_failed: "Could not reach the server. Check your connection and try again.",
};

async function parseFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as FeedbackResponse;
      if (typeof body?.error === "string") return body.error;
    } catch {
      /* ignore */
    }
  }
  if (error instanceof Error && /not found|404/i.test(error.message)) {
    return "function_not_found";
  }
  return "store_failed";
}

/** Phase 1 — durable feedback via Supabase Edge Function `feedback`. */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "unauthorized", message: ERROR_MESSAGES.unauthorized };
  }

  try {
    const { data, error } = await supabase.functions.invoke<FeedbackResponse>("feedback", {
      body: {
        category: input.category,
        subject: input.subject.trim(),
        message: input.message.trim(),
        source: "native",
      },
    });

    if (error) {
      const code = await parseFunctionError(error);
      return {
        ok: false,
        error: code,
        message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.store_failed,
      };
    }

    if (data?.ok === true && data.stored !== false) {
      return { ok: true, emailSent: data.emailSent === true };
    }

    const code = typeof data?.error === "string" ? data.error : "store_failed";
    return {
      ok: false,
      error: code,
      message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.store_failed,
    };
  } catch (e) {
    return {
      ok: false,
      error: isNetworkRequestFailed(e) ? "network_failed" : "store_failed",
      message: isNetworkRequestFailed(e)
        ? ERROR_MESSAGES.network_failed
        : ERROR_MESSAGES.store_failed,
    };
  }
}
