import { supabase } from "./supabase/client";

export type AccountLifecycleState = "active" | "paused" | "delete_pending";

export type AccountSettingsSnapshot = {
  isPrivate: boolean;
  lifecycle: AccountLifecycleState;
  accountPurgeAt: string | null;
};

const cache = new Map<string, AccountSettingsSnapshot>();

export function getCachedAccountSettings(userId: string): AccountSettingsSnapshot | null {
  return cache.get(userId) ?? null;
}

export async function fetchAccountSettings(userId: string): Promise<AccountSettingsSnapshot> {
  const { data } = await supabase
    .from("profiles")
    .select("is_private, account_lifecycle_state, account_purge_at")
    .eq("id", userId)
    .maybeSingle();

  const st = data?.account_lifecycle_state;
  const lifecycle: AccountLifecycleState =
    st === "paused" || st === "delete_pending" ? st : "active";

  const snap: AccountSettingsSnapshot = {
    isPrivate: !!data?.is_private,
    lifecycle,
    accountPurgeAt:
      typeof data?.account_purge_at === "string" ? data.account_purge_at : null,
  };
  cache.set(userId, snap);
  return snap;
}

export async function updatePrivateAccount(
  userId: string,
  isPrivate: boolean
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from("profiles").update({ is_private: isPrivate }).eq("id", userId);
  if (error) {
    return { ok: false, message: "Could not update privacy. Try again." };
  }
  return { ok: true };
}

export async function cancelAccountDeletion(): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) {
    return { ok: false, message: "Could not cancel deletion. Try again." };
  }
  return { ok: true };
}
