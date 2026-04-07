import { NextResponse } from "next/server";
import { summarizeDocument } from "@/services/aiService";
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
