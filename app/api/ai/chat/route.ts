import { NextResponse } from "next/server";
import { chatWithAI, logAIRequest } from "@/services/aiService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { message, userId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await chatWithAI(message);

    await logAIRequest(userId, "chat", message, response);

    return NextResponse.json({
      reply: response,
    });
  } catch (error) {
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }
}
