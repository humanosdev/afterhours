import { supabase } from "./supabase/client";

/** Instant thread sync when postgres DELETE payload is delayed or empty. */
export async function broadcastChatMessageDeleted(
  chatId: string,
  messageId: string
): Promise<void> {
  const channel = supabase.channel(`chat:${chatId}`);

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 400);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  try {
    await channel.send({
      type: "broadcast",
      event: "message_deleted",
      payload: { id: messageId },
    });
  } catch {
    /* optional — postgres DELETE may still deliver */
  } finally {
    void supabase.removeChannel(channel);
  }
}
