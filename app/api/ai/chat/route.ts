import { NextResponse } from "next/server";
import { chatWithAI } from "@/services/aiService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const response = await chatWithAI(message);

    return NextResponse.json({
      reply: response,
    });
  } catch (error) {
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }
}
