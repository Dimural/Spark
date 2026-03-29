import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { getServerSupabaseClient } from "./supabase";

type AuthContext = {
  supabase: SupabaseClient;
  user: User;
};

function requirePublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return { url, anonKey };
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

function createBearerSupabaseClient(token: string) {
  const { url, anonKey } = requirePublicSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function getRequestAuthContext(
  request: NextRequest,
): Promise<AuthContext | null> {
  const bearerToken = getBearerToken(request);

  if (bearerToken) {
    const supabase = createBearerSupabaseClient(bearerToken);
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);

    if (!user) {
      return null;
    }

    return { supabase, user };
  }

  const supabase = await getServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { supabase, user };
}
