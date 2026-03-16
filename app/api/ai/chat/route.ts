import { NextResponse } from "next/server";
import { chatWithAI, logAIRequest } from "@/services/aiService";
import { checkUsageLimit } from "@/utils/usageLimit";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { message, userId } = body;

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

    const usage = await checkUsageLimit(userId);

    console.log("[api/ai/chat] Usage result", {
      resolvedUserId: userId,
      usage,
    });

    if (!usage.allowed) {
      const status = usage.reason === "error" ? 500 : 403;
      return NextResponse.json({ error: usage.message }, { status });
    }

    const response = await chatWithAI(message);

    await logAIRequest(userId, "chat", message, response);

    return NextResponse.json({
      reply: response,
    });
  } catch (error) {
    console.error("[api/ai/chat] Unhandled error", error);
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }
}
