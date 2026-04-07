export const runtime = "nodejs";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePdfFromDocument } from "@/services/pdfService";

import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  // STEP 1 — Authenticate
  const { user, error: authError } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return Response.json(
      { error: authError || "Unauthorized" },
      { status: 401 },
    );
  }

  // STEP 2 — Existing logic (UNCHANGED)
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id")?.trim();

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const { data: document, error } = await supabaseAdmin
    .from("documents")
    .select("file_name, summary")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const normalizedDocument = {
    file_name: document.file_name ?? "document",
    summary: document.summary ?? "No summary available.",
  };

  const pdfBuffer = await generatePdfFromDocument(normalizedDocument);

  const fileName =
    normalizedDocument.file_name.replace(/\.[^.]+$/, "") || "document";

  return new Response(Buffer.from(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
    },
  });
}
