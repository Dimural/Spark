import { NextRequest, NextResponse } from "next/server";
import { getRequestAuthContext } from "@/lib/api-auth";

const supportedTypes = new Set(["calendar_event", "reminder", "note"]);

export async function GET(request: NextRequest) {
  const auth = await getRequestAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  const type = request.nextUrl.searchParams.get("type");

  if (type && !supportedTypes.has(type)) {
    return NextResponse.json(
      { success: false, error: "Unsupported event type filter." },
      { status: 400 },
    );
  }

  let query = auth.supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, events: data ?? [] });
}
