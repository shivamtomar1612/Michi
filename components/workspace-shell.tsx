"use client";

import { Link } from "@/i18n/navigation";
import { Fragment } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarDays, ChartNoAxesCombined, Compass, LayoutDashboard, LogOut, Menu, Map, Settings2, Store, Users } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Logo } from "@/components/logo";
import { NotificationCenter } from "@/components/notification-center";
import { logoutAction } from "@/features/auth/actions";
import { SkipLink } from "@/components/skip-link";
import { LocaleSwitcher } from "@/components/locale-switcher";

const pagesFor = (role: string) => role.toLowerCase() === "host" ? [
  { label: "overview", icon: LayoutDashboard, href: "" },
  { label: "experiences", icon: Store, href: "/experiences" },
  { label: "bookings", icon: CalendarDays, href: "/bookings" },
  { label: "analytics", icon: ChartNoAxesCombined, href: "/analytics" },
  { label: "community", icon: Users, href: "/community" },
  { label: "settings", icon: Settings2, href: "/settings" },
] : [
  { label: "overview", icon: LayoutDashboard, href: "" },
  { label: "discover", icon: Compass, href: "/discover" },
  ...(role.toLowerCase() === "traveler" ? [
    { label: "plan", icon: Map, href: "/plan" },
    { label: "myBookings", icon: CalendarDays, href: "/bookings" },
    { label: "feedback", icon: Users, href: "/community/feedback", absolute: true },
  ] : []),
  ...(role.toLowerCase() === "dmo" ? [
    { label: "feedback", icon: Users, href: "/community/feedback", absolute: true },
  ] : []),
];

function WorkspaceNav({ role, basePath, closeOnNavigate = false }: { role: string; basePath: string; closeOnNavigate?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("Workspace");
  const roleLabel = t(`role${role.charAt(0).toUpperCase()}${role.slice(1).toLowerCase()}` as "roleTraveler" | "roleHost" | "roleDmo" | "roleAdmin");
  return <nav aria-label={t("navigation", { role: roleLabel })} className="space-y-1">
    {pagesFor(role).map(({ label, icon: Icon, href, absolute }) => {
      const target = absolute ? href : `${basePath}${href}`;
      const active = pathname === target;
      const link = <Link href={target} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm transition-colors ${active ? "border-vermilion bg-paper-deep font-semibold text-ink" : "border-transparent text-ink/70 hover:bg-ink/5 hover:text-ink"}`}><Icon className="size-4" aria-hidden="true" />{t(label as "overview" | "experiences" | "bookings" | "analytics" | "community" | "settings" | "discover" | "plan" | "myBookings" | "feedback")}</Link>;
      return closeOnNavigate ? <DrawerClose key={label} asChild>{link}</DrawerClose> : <Fragment key={label}>{link}</Fragment>;
    })}
  </nav>;
}

export function WorkspaceShell({ role, basePath, children }: { role: string; basePath: string; children: React.ReactNode }) {
  const t = useTranslations("Workspace");
  const roleLabel = t(`role${role.charAt(0).toUpperCase()}${role.slice(1).toLowerCase()}` as "roleTraveler" | "roleHost" | "roleDmo" | "roleAdmin");
  return <div className="min-h-screen bg-paper"><SkipLink />
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95">
      <div className="flex h-16 items-center justify-between px-4 sm:px-7">
        <div className="flex items-center gap-4">
          <Logo className="text-xl" />
          <span className="hidden h-5 w-px bg-ink/20 sm:block" aria-hidden="true" />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-ink/60 sm:block">{t("title", { role: roleLabel })}</span>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <NotificationCenter />
          <form action={logoutAction}><button type="submit" className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold text-ink/65 hover:text-vermilion"><LogOut className="size-4" aria-hidden="true" /><span className="hidden sm:inline">{t("signOut")}</span></button></form>
          <Drawer>
            <DrawerTrigger className="inline-flex size-10 items-center justify-center border border-ink/15 lg:hidden" aria-label="Open workspace navigation"><Menu className="size-4" /></DrawerTrigger>
            <DrawerContent aria-describedby="workspace-menu-description">
              <DrawerTitle className="font-serif text-2xl">{t("title", { role: roleLabel })}</DrawerTitle><DrawerDescription id="workspace-menu-description" className="mt-2 text-sm text-ink/60">{t("yourWorkspace")}</DrawerDescription>
              <div className="mt-8"><WorkspaceNav role={role} basePath={basePath} closeOnNavigate /></div>
              <form action={logoutAction} className="mt-8"><DrawerClose asChild><button type="submit" className="flex min-h-11 w-full items-center gap-2 border-t border-ink/10 pt-4 text-sm font-semibold"><LogOut className="size-4" />{t("signOut")}</button></DrawerClose></form>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
    <div className="mx-auto flex max-w-[1600px]">
      <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-ink/10 bg-paper px-5 py-7 lg:block">
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-ink/45">{t("title", { role: roleLabel })}</p><WorkspaceNav role={role} basePath={basePath} />
        <div className="mt-10 border-t border-ink/10 pt-6"><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/45">{t("accessProtected")}</p></div>
        <Link className="mt-10 inline-flex items-center gap-2 px-3 text-xs text-ink/55 hover:text-vermilion" href="/"><ArrowLeft className="size-3.5" /> {t("publicSite")}</Link>
      </aside>
      <main className="min-w-0 flex-1 px-5 pb-20 pt-9 sm:px-8 sm:pb-20 sm:pt-12 lg:px-12 lg:pb-12" id="main-content">{children}</main>
    </div>
  </div>;
}
