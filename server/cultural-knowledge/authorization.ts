import "server-only";
import { createClient } from "@/lib/supabase/server";
import { canPublishCulturalVerification } from "@/features/cultural-knowledge/authorization";

export { canPublishCulturalVerification };

export async function getKnowledgeAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, authorized: false as const };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin") return { supabase, user, authorized: false as const };
  return { supabase, user, authorized: true as const };
}
