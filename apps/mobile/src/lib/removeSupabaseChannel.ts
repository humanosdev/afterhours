import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

function channelMatchesName(topic: string, name: string): boolean {
  return topic === name || topic === `realtime:${name}`;
}

/** Drop any existing realtime channel for `name` before re-subscribing (avoids duplicate `.on()` after `subscribe()`). */
export async function removeSupabaseChannelsByName(
  supabase: SupabaseClient,
  name: string
): Promise<RealtimeChannel[]> {
  const matches = supabase
    .getChannels()
    .filter((channel) => channelMatchesName(channel.topic, name));

  await Promise.all(matches.map((channel) => supabase.removeChannel(channel)));
  return matches;
}
