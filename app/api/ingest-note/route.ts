import { NextRequest, NextResponse } from "next/server";
import { getRequestAuthContext } from "@/lib/api-auth";
import { runSparkAgent } from "@/lib/agent-runner";
import { checkRateLimit } from "@/lib/rate-limit";

type IngestNoteBody = {
  text?: unknown;
  user_id?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const auth = await getRequestAuthContext(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  let body: IngestNoteBody;

  try {
    body = (await request.json()) as IngestNoteBody;
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";

  if (!text) {
    return jsonError("`text` is required.", 400);
  }

  if (!userId) {
    return jsonError("`user_id` is required.", 400);
  }

  if (userId !== auth.user.id) {
    return jsonError("Authenticated user does not match request user_id.", 401);
  }

  const userTimezone =
    typeof auth.user.user_metadata?.timezone === "string" &&
    auth.user.user_metadata.timezone.trim()
      ? auth.user.user_metadata.timezone.trim()
      : "America/Toronto";

  let rateLimit;

  try {
    rateLimit = await checkRateLimit(auth.user.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Rate limiting is unavailable.";

    return jsonError(message, 503);
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Try again tomorrow.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      },
    );
  }

  try {
    const result = await runSparkAgent({
      raw_text: text,
      user_id: auth.user.id,
      user_timezone: userTimezone,
    });
    const processed = result.result;

    if (!processed?.type || !processed?.title) {
      throw new Error("Spark agent returned an invalid response.");
    }

    return NextResponse.json(
      {
        success: true,
        processed: {
          type: processed.type,
          title: processed.title,
        },
        result: processed,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Spark failed to process the note.";

    return jsonError(message, 500);
  }
}
