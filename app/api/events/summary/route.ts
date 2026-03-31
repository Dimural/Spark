import { NextRequest, NextResponse } from "next/server";
import { getRequestAuthContext } from "@/lib/api-auth";
import { getDashboardSnapshot } from "@/lib/dashboard";

export async function GET(request: NextRequest) {
  const auth = await getRequestAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const { summary } = await getDashboardSnapshot(auth.supabase);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load dashboard summary.",
      },
      { status: 500 },
    );
  }
}
