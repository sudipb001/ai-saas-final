export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { extractTextFromDocument } from "@/services/documentProcessor";

export async function POST(req: Request) {
  try {
    const { filePath } = await req.json();

    const text = await extractTextFromDocument(filePath);

    return NextResponse.json({
      text,
    });
  } catch (error) {
    console.error("Document extraction error:", error);

    return NextResponse.json(
      { error: "Text extraction failed" },
      { status: 500 },
    );
  }
}
