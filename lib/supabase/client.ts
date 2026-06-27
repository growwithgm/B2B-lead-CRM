"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Uses the anon key + the user's cookie-based
// session. RLS ("authenticated full access") gates what it can read/write.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
