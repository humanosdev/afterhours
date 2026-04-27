import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
export async function upsertMyPresence(params: {
  userId: string;
  lat: number;
  lng: number;
  accuracy: number;
}) {
  const { userId, lat, lng, accuracy } = params;

  const { error } = await supabase.from("user_presence").upsert({
    user_id: userId,
    lat,
    lng,
    accuracy,
    last_updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
