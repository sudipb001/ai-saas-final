import { NextResponse } from "next/server";
import { summarizeDocument } from "@/services/aiService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const summary = await summarizeDocument(text);

    return NextResponse.json({
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "AI summarization failed" },
      { status: 500 },
    );
  }
}
