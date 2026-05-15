function requireEnv(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing ${name}. See apps/mobile/.env.example`);
  }
  return value.trim();
}

export function getSupabaseUrl(): string {
  return requireEnv("EXPO_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
