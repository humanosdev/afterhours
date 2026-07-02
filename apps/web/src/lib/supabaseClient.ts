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
