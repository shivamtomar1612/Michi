import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return <footer className="bg-ink text-paper">
    <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <div className="grid gap-12 border-b border-white/15 pb-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light className="text-3xl" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">A more considered way to travel through Japan — with respect for place, people, and the pace of everyday life.</p>
        </div>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Explore</p><div className="mt-4 grid gap-3 text-sm text-white/80"><Link href="/discover">Discover</Link><Link href="/experiences">Experiences</Link><Link href="/destinations">Destinations</Link><Link href="/about">How MICHI works</Link></div></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Join the exchange</p><div className="mt-4 grid gap-3 text-sm text-white/80"><Link href="/auth/signup">Travelers</Link><Link href="/auth/signup">Community hosts</Link><Link href="/about">Our principles</Link></div><Link href="/discover" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">Begin exploring <ArrowUpRight className="size-4" /></Link></div>
      </div>
      <div className="flex flex-col justify-between gap-3 pt-6 text-xs text-white/45 sm:flex-row"><span>© 2026 MICHI. A project in progress.</span><span>Check each official source for current details before visiting.</span></div>
    </div>
  </footer>;
}
