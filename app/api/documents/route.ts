import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("id,file_name,file_path,summary,created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import { createServerSupabaseClient } from "@/lib/supabaseServer";
// import { supabaseAdmin } from "@/lib/supabaseAdmin";

// export async function GET() {
//   try {
//     const supabaseServer = await createServerSupabaseClient();
//     const {
//       data: { user },
//       error: userError,
//     } = await supabaseServer.auth.getUser();

//     if (userError || !user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { data, error } = await supabaseAdmin
//       .from("documents")
//       .select("id,file_name,file_path,summary,created_at")
//       .order("created_at", { ascending: false })
//       .limit(20);

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({ documents: data ?? [] });
//   } catch (error) {
//     const message =
//       error instanceof Error ? error.message : "Internal Server Error";
//     return NextResponse.json({ error: message }, { status: 500 });
//   }
// }
