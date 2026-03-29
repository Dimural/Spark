import { createClient } from "@supabase/supabase-js";
import { hasPublicSupabaseEnv } from "./env";

let adminClient: ReturnType<typeof createClient<any>> | null = null;

export function getServiceRoleSupabaseClient() {
  if (!hasPublicSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminClient;
}
