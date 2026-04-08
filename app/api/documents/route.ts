import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: Request) {
  // STEP 1 — Authenticate user
  const { user, error: authError } = await getAuthenticatedUser(req);

  if (authError || !user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 },
    );
  }

  // STEP 2 — Existing logic (UNCHANGED)
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ data, error });
}
