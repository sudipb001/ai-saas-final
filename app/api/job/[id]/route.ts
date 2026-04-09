import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  // FIX: await params
  const { id } = await context.params;

  // Authenticate
  const { user, error } = await getAuthenticatedUser(req);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch job
  const { data, error: fetchError } = await supabaseAdmin
    .from("processing_jobs")
    .select("id, status, document_id, error_message")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
