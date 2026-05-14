import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — must use `@supabase/ssr` so the session is stored in cookies
 * that middleware + Route Handlers (`createServerClient`) can read.
 * Plain `@supabase/supabase-js` defaults to localStorage-only → `/api/*` sees no user → 401.
 */
export const supabase = createBrowserClient(
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
