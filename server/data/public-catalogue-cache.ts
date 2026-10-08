import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { describeCatalogueError, type CatalogueFailure } from "@/lib/data-sources/catalogue-errors";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

type PublicQuery = (client: SupabaseClient<Database>) => PromiseLike<{
  data: unknown;
  error: { code?: string; message: string } | null;
}>;

function createCachedPublicQuery(key: string, query: PublicQuery) {
  return async () => {
    const config = getSupabasePublicConfig();
    if (!config) throw new Error("Supabase public configuration is missing.");

    const load = unstable_cache(async () => {
      const client = createSupabaseClient<Database>(config.url, config.key, {
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
      });
      const { data, error } = await query(client);
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      return data ?? [];
    }, ["michi-public-catalogue-v1", config.url, key], { revalidate: 60, tags: ["michi-public-catalogue"] });
    return load();
  };
}

export async function runCachedPublicQuery<T>(key: string, query: PublicQuery) {
  try {
    const load = createCachedPublicQuery(key, query);
    return { ok: true as const, data: await load() as T[] };
  } catch (cause) {
    const error = cause && typeof cause === "object" ? cause as { code?: string; message?: string } : {};
    const failure: CatalogueFailure = describeCatalogueError(error);
    return { ok: false as const, ...failure };
  }
}
