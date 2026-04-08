import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");

  console.log("[AUTH]", {
    hasAuthHeader: !!authHeader,
  });

  // Token authentication
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && data?.user) {
        return { user: data.user, error: null };
      }
    }
  }

  // POST fallback (body)
  try {
    const body = await req.clone().json();

    if (body?.userId) {
      console.log("[AUTH_FALLBACK]", { source: "body" });

      return {
        user: { id: body.userId },
        error: null,
      };
    }
  } catch {}

  // GET fallback (query)
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (userId) {
      console.log("[AUTH_FALLBACK]", { source: "query" });

      return {
        user: { id: userId },
        error: null,
      };
    }
  } catch {}

  return { user: null, error: "Unauthorized" };
}
