import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { homeForRole, isAppRole, type AppRole } from "@/lib/auth/redirects";

export async function requireRole(allowed: AppRole[]) {
  if (!isSupabaseConfigured()) redirect("/auth/login?error=setup");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !isAppRole(profile.role)) redirect("/auth/login?error=profile");
  if (!allowed.includes(profile.role)) redirect(homeForRole(profile.role));
  return { user, role: profile.role };
}
