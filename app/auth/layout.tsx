import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="min-h-screen bg-paper px-5 py-8 sm:px-8"><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] flex-col justify-between">
    <div className="flex items-center justify-between"><Logo className="text-xl" /><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">A more considered journey</span></div>
    <div className="flex flex-1 items-center justify-center py-16">{children}</div>
    <p className="text-center text-[11px] text-ink/45">© 2026 MICHI · A more considered way to travel</p>
  </div></main>;
}
