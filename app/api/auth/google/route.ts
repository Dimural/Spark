import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleOAuthUrl,
  exchangeCodeForGoogleTokens,
  serializeGoogleTokens,
} from "@/lib/google-calendar";
import { getServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { getServerSupabaseClient } from "@/lib/supabase";

async function redirectToDashboard(request: NextRequest, status: string, error?: string) {
  const redirectUrl = new URL("/dashboard", request.url);

  redirectUrl.searchParams.set("google", status);

  if (error) {
    redirectUrl.searchParams.set("error", error);
  }

  return NextResponse.redirect(redirectUrl);
}

async function handleGoogleAuth(request: NextRequest) {
  const supabase = await getServerSupabaseClient();
  const adminSupabase = getServiceRoleSupabaseClient();

  if (!supabase || !adminSupabase) {
    return redirectToDashboard(request, "error", "supabase_not_configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToDashboard(request, "error", "not_authenticated");
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(buildGoogleOAuthUrl(user.id));
  }

  try {
    const tokens = await exchangeCodeForGoogleTokens(code);
    const serialized = serializeGoogleTokens(tokens);
    const { error } = await adminSupabase
      .from("users")
      .update(serialized)
      .eq("id", user.id);

    if (error) {
      throw error;
    }

    return redirectToDashboard(request, "connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "google_oauth_failed";

    return redirectToDashboard(request, "error", message);
  }
}

export async function GET(request: NextRequest) {
  return handleGoogleAuth(request);
}

export async function POST(request: NextRequest) {
  return handleGoogleAuth(request);
}
