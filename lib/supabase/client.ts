"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "./env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Supabase is not configured. Set the public Supabase URL and anon/publishable key.");
  browserClient = createBrowserClient<Database>(config.url, config.key);
  return browserClient;
}
