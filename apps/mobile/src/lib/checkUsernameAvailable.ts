import { supabase } from "./supabase/client";

function isMissingUsernameRpc(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST202" ||
    Boolean(error.message?.includes("is_username_available")) ||
    Boolean(error.message?.includes("Could not find the function"))
  );
}

/** Exact availability check; falls back to eq query if RPC migration is not applied yet. */
export async function checkUsernameAvailable(
  username: string,
  excludeUserId: string
): Promise<{ available: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("is_username_available", {
    p_username: username,
    p_exclude_user_id: excludeUserId,
  });

  if (!error) {
    return { available: data === true, error: null };
  }

  if (!isMissingUsernameRpc(error)) {
    return { available: false, error: error.message };
  }

  const { data: rows, error: qErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", excludeUserId)
    .limit(1);

  if (qErr) {
    return { available: false, error: qErr.message };
  }

  return { available: !rows?.length, error: null };
}
