import { NextResponse } from "next/server";
import { extractTextFromDocument } from "@/services/documentProcessor";
import { summarizeDocumentText } from "@/services/aiService";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = body?.filePath;

    if (typeof filePath !== "string" || !filePath.trim()) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 },
      );
    }

    const text = await extractTextFromDocument(filePath);
    const summary = await summarizeDocumentText(text);

    const fileName = filePath.split("/").pop();

    const { error } = await supabaseServer.from("documents").insert({
      file_name: fileName,
      file_path: filePath,
      summary,
    });

    // const { error } = await supabaseServer.from("documents").insert({
    //   file_path: filePath,
    //   summary,
    // });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
