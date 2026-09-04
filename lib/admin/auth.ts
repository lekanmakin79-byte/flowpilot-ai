import "server-only";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createSupabaseAdmin(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export function isAdminEmail(
  email: string | null | undefined
): boolean {
  const adminEmail =
    process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || !email) {
    return false;
  }

  return (
    email.trim().toLowerCase() ===
    adminEmail
  );
}
