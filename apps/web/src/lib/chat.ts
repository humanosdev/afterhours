import { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateDM(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string
) {
  if (currentUserId === otherUserId) {
    throw new Error("Cannot create DM with yourself");
  }

  // 1. Find conversations where BOTH users are members
  const { data: sharedConversations, error: sharedError } =
    await supabase
      .from("conversation_members")
      .select("conversation_id")
      .in("user_id", [currentUserId, otherUserId]);

  if (sharedError) throw sharedError;

  // Count how many times each conversation_id appears
  const counts: Record<string, number> = {};
  for (const row of sharedConversations ?? []) {
    counts[row.conversation_id] =
      (counts[row.conversation_id] || 0) + 1;
  }

  // 2. Look for a conversation shared by BOTH users
  const existingConversationId = Object.entries(counts).find(
    ([_, count]) => count === 2
  )?.[0];

  if (existingConversationId) {
    return existingConversationId;
  }

  // 3. Create new conversation
  const { data: conversation, error: convoError } =
    await supabase
      .from("conversations")
      .insert({ created_by: currentUserId })
      .select("id")
      .single();

  if (convoError) throw convoError;

  const conversationId = conversation.id;

  // 4. Insert both members
  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conversationId, user_id: currentUserId },
      { conversation_id: conversationId, user_id: otherUserId },
    ]);

  if (membersError) throw membersError;

  return conversationId;
}
