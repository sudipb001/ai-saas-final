import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/*
-------------------------------------------------------
Supabase configuration
-------------------------------------------------------
*/

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/*
-------------------------------------------------------
Server Auth Client (cookie session)
Used in API routes to identify the logged-in user
-------------------------------------------------------
*/

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}

/*
-------------------------------------------------------
Admin Client (service role)
Used only for trusted server operations
-------------------------------------------------------
*/

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
