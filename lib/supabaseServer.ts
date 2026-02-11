import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Supabase server env vars are missing");
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
