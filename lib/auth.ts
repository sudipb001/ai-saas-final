import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return { user: null, error: "Token not provided" };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: "Invalid or expired token" };
  }

  return { user: data.user, error: null };
}
