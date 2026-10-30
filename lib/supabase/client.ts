"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoClient } from "@/lib/demo/fake-client";
import { DEMO_MODE } from "@/lib/demo/mode";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let browserClient: SupabaseClient | undefined;

export function getBrowserClient(): SupabaseClient {
  browserClient ??= DEMO_MODE
    ? createDemoClient()
    : createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
}
