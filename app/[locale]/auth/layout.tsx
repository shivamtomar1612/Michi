import { Logo } from "@/components/logo";
import { SkipLink } from "@/components/skip-link";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><SkipLink /><main id="main-content" className="min-h-screen bg-paper px-5 py-8 sm:px-8"><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] flex-col justify-between">
    <div className="flex items-center justify-between"><Logo className="text-xl" /><div className="flex items-center gap-4"><span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45 sm:inline">A more considered journey</span><LocaleSwitcher /></div></div>
    <div className="flex flex-1 items-center justify-center py-16">{children}</div>
    <p className="text-center text-[11px] text-ink/45">© 2026 MICHI · A more considered way to travel</p>
  </div></main></>;
}
