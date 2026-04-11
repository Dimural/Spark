import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getRequestAuthContext } from "@/lib/api-auth";
import { getServiceRoleSupabaseClient } from "@/lib/supabase-admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// GET  — return existing key (or generate one) for the authenticated user
export async function GET(request: NextRequest) {
  const auth = await getRequestAuthContext(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const admin = getServiceRoleSupabaseClient();

  if (!admin) {
    return jsonError("Service unavailable.", 503);
  }

  // Fetch current key
  const { data, error } = await admin
    .from("users")
    .select("shortcut_api_key")
    .eq("id", auth.user.id)
    .single();

  if (error) {
    return jsonError("Failed to load user record.", 500);
  }

  if (data?.shortcut_api_key) {
    return NextResponse.json({ api_key: data.shortcut_api_key });
  }

  // Generate a new key and store it
  const newKey = `sk_spark_${randomBytes(24).toString("hex")}`;

  const { error: updateError } = await admin
    .from("users")
    .update({ shortcut_api_key: newKey })
    .eq("id", auth.user.id);

  if (updateError) {
    return jsonError("Failed to create API key.", 500);
  }

  return NextResponse.json({ api_key: newKey });
}

// POST — rotate (regenerate) the key
export async function POST(request: NextRequest) {
  const auth = await getRequestAuthContext(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const admin = getServiceRoleSupabaseClient();

  if (!admin) {
    return jsonError("Service unavailable.", 503);
  }

  const newKey = `sk_spark_${randomBytes(24).toString("hex")}`;

  const { error } = await admin
    .from("users")
    .update({ shortcut_api_key: newKey })
    .eq("id", auth.user.id);

  if (error) {
    return jsonError("Failed to rotate API key.", 500);
  }

  return NextResponse.json({ api_key: newKey });
}
