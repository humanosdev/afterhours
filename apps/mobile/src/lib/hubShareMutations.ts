import { createStoryLikeNotification } from "./createNotification";
import { supabase } from "./supabase/client";

export async function toggleHubShareLike(
  shareId: string,
  meId: string,
  ownerUserId: string,
  currentlyLiked: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (currentlyLiked) {
    const { error } = await supabase.from("story_likes").delete().eq("story_id", shareId).eq("user_id", meId);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const { error } = await supabase.from("story_likes").insert({ story_id: shareId, user_id: meId });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (ownerUserId !== meId) {
    await createStoryLikeNotification({
      recipientId: ownerUserId,
      actorId: meId,
      storyId: shareId,
      isShare: true,
    });
  }
  return { ok: true };
}

export async function toggleHubShareHidden(
  shareId: string,
  meId: string,
  nextHidden: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("stories")
    .update({ share_hidden: nextHidden })
    .eq("id", shareId)
    .eq("user_id", meId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteHubShare(shareId: string, meId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("stories").delete().eq("id", shareId).eq("user_id", meId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
