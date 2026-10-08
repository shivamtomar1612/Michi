import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let account: { name: string; role: string } | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();
        if (profile) account = { name: profile.full_name || "Your MICHI account", role: profile.role };
      }
    } catch { /* Public pages remain available when account services are unavailable. */ }
  }
  return <><a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-paper focus:px-4 focus:py-3" href="#main-content">Skip to content</a><SiteHeader account={account} /><main id="main-content">{children}</main><SiteFooter /></>;
}
