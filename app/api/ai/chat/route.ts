import { NextResponse } from "next/server";
import { chatWithAI, logAIRequest } from "@/services/aiService";
import { checkUsageLimit } from "@/utils/usageLimit";
import { checkRateLimit } from "@/utils/rateLimiter";

import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // STEP 1 — Authenticate
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 },
      );
    }

    // STEP 2 — Existing logic (UNCHANGED)
    const body = await request.json();
    const { message } = body;
    const userId = user.id;

    console.log("[api/ai/chat] Incoming request", {
      resolvedUserId: userId,
      hasMessage: Boolean(message),
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /*
    ---------------------------------------------------
    Check subscription usage limits
    ---------------------------------------------------
    */

    const usage = await checkUsageLimit(userId);

    console.log("[api/ai/chat] Usage result", {
      resolvedUserId: userId,
      usage,
    });

    if (!usage.allowed) {
      const status = usage.reason === "error" ? 500 : 403;

      return NextResponse.json({ error: usage.message }, { status });
    }

    /*
    ---------------------------------------------------
    Rate limiting
    ---------------------------------------------------
    */

    const rateAllowed = checkRateLimit(userId);

    if (!rateAllowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 },
      );
    }

    /*
    ---------------------------------------------------
    Call OpenAI
    ---------------------------------------------------
    */

    const response = await chatWithAI(message);

    /*
    ---------------------------------------------------
    Log AI request
    ---------------------------------------------------
    */

    await logAIRequest(userId, "chat", message, response);

    return NextResponse.json({
      reply: response,
    });
  } catch (error) {
    console.error("[api/ai/chat] Unhandled error", error);

    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }
}
