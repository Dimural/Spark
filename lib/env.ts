const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GROQ_API_KEY",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TOKEN_ENCRYPTION_KEY",
] as const;

export type RequiredEnvKey = (typeof requiredEnvKeys)[number];

export const publicSupabaseEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function getMissingEnvKeys(keys: readonly string[] = requiredEnvKeys) {
  return keys.filter((key) => !process.env[key]?.trim());
}

export function hasPublicSupabaseEnv() {
  // Next.js only inlines NEXT_PUBLIC_* with direct dot-notation access;
  // dynamic process.env[key] lookups resolve to undefined on the client.
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function hasAllRequiredEnv() {
  return getMissingEnvKeys().length === 0;
}

export function getEnvStatus() {
  return {
    missingPublicSupabase: getMissingEnvKeys(publicSupabaseEnvKeys),
    missingAll: getMissingEnvKeys(),
  };
}
