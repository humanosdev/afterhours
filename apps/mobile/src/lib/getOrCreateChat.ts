import { supabase } from "./supabase/client";

/** Find or create a 1:1 chat row — mirrors web `startChatWithFriend`. */
export async function getOrCreateChat(
  meId: string,
  otherUserId: string
): Promise<{ chatId: string } | { error: string }> {
  if (!meId || !otherUserId || meId === otherUserId) {
    return { error: "invalid_users" };
  }

  const { data: existing, error: existingErr } = await supabase
    .from("chats")
    .select("id")
    .or(
      `and(user1_id.eq.${meId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${meId})`
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) return { error: existingErr.message };
  if (existing?.id) return { chatId: existing.id };

  const { data: created, error: createErr } = await supabase
    .from("chats")
    .insert({
      user1_id: meId,
      user2_id: otherUserId,
      last_message: null,
    })
    .select("id")
    .single();

  if (createErr) {
    if (createErr.code === "23505") {
      const { data: raced } = await supabase
        .from("chats")
        .select("id")
        .or(
          `and(user1_id.eq.${meId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${meId})`
        )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (raced?.id) return { chatId: raced.id };
    }
    return { error: createErr.message };
  }

  if (!created?.id) {
    return { error: "create_failed" };
  }

  return { chatId: created.id };
}
