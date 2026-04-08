export const runtime = "nodejs";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateExcelFromDocuments } from "@/services/excelService";

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

  // Step 1 — Fetch all documents
  const { data: documents, error } = await supabaseAdmin
    .from("documents")
    .select("file_name, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!documents || documents.length === 0) {
    return Response.json({ error: "No documents found" }, { status: 404 });
  }

  const normalizedDocuments = documents.map((doc) => ({
    file_name: doc.file_name ?? "Untitled",
    summary: doc.summary ?? "No summary available.",
    created_at: doc.created_at ?? null,
  }));

  // Step 2 — Generate Excel file
  const excelBuffer = generateExcelFromDocuments(normalizedDocuments);

  // Step 3 — Return file response
  return new Response(excelBuffer as any, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="documents.xlsx"`,
    },
  });
}
