"use client";

import { Link } from "@/i18n/navigation";
import { Menu } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ButtonLink } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const navLinks = [
  { label: "discover", href: "/discover" },
  { label: "experiences", href: "/experiences" },
  { label: "destinations", href: "/destinations" },
  { label: "howItWorks", href: "/about" },
] as const;

export function SiteHeader({ account }: { account?: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  return <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 text-ink backdrop-blur-sm">
    <div className="container-editorial flex h-[4.5rem] items-center justify-between">
      <Logo />
      <nav aria-label={t("main")} className="hidden items-center gap-7 lg:flex">
        {navLinks.map((link) => <Link key={link.href} href={link.href} aria-current={pathname.endsWith(link.href) ? "page" : undefined} className="text-[13px] font-medium text-ink/80 transition-colors hover:text-vermilion">{t(link.label)}</Link>)}
      </nav>
      <div className="hidden items-center gap-5 lg:flex">
        {account ? <details className="relative"><summary className="min-h-11 cursor-pointer content-center text-[13px] font-medium text-ink/80 hover:text-vermilion">{account.name} ▾</summary><div className="absolute right-0 top-full z-50 mt-2 min-w-56 border border-ink/15 bg-paper p-2 text-ink shadow-xl"><Link className="block min-h-10 px-3 py-2 text-sm hover:bg-ink/5" href={`/${account.role}`}>{t("workspace")}</Link>{account.role === "traveler" ? <><Link className="block min-h-10 px-3 py-2 text-sm hover:bg-ink/5" href="/traveler/itineraries">{t("myItineraries")}</Link><Link className="block min-h-10 px-3 py-2 text-sm hover:bg-ink/5" href="/traveler/bookings">{t("myBookings")}</Link><Link className="block min-h-10 px-3 py-2 text-sm hover:bg-ink/5" href="/traveler/passport">{t("culturalPassport")}</Link><Link className="block min-h-10 px-3 py-2 text-sm hover:bg-ink/5" href="/traveler/profile">{t("profile")}</Link></> : null}<form action={logoutAction}><button className="block min-h-10 w-full px-3 py-2 text-left text-sm text-vermilion hover:bg-ink/5" type="submit">{t("signOut")}</button></form></div></details> : <Link href="/auth/login" className="min-h-11 content-center text-[13px] font-medium hover:text-vermilion">{t("signIn")}</Link>}
        <LocaleSwitcher />
        <ButtonLink href="/discover" size="small">{t("exploreJapan")}</ButtonLink>
      </div>
      <div className="flex items-center gap-3 lg:hidden">
        <LocaleSwitcher />
        <ButtonLink className="hidden sm:inline-flex" href="/discover" size="small">{t("exploreJapan")}</ButtonLink>
        <Drawer>
          <DrawerTrigger className="inline-flex size-11 items-center justify-center border border-ink/15 text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion" aria-label={t("openMenu")}><Menu className="size-5" /></DrawerTrigger>
          <DrawerContent aria-describedby="mobile-navigation-description">
            <Logo />
            <DrawerTitle className="sr-only">{t("mobile")}</DrawerTitle>
            <DrawerDescription id="mobile-navigation-description" className="mt-2 text-sm text-ink/60">{t("continueExploring")}</DrawerDescription>
            <nav aria-label={t("mobile")} className="mt-8 flex flex-col border-y border-ink/10">
              {navLinks.map((link) => <DrawerClose key={link.href} asChild><Link href={link.href} aria-current={pathname.endsWith(link.href) ? "page" : undefined} className="min-h-12 border-b border-ink/10 py-4 text-base font-medium last:border-0">{t(link.label)}</Link></DrawerClose>)}
            </nav>
            {account ? <><DrawerClose asChild><Link href={`/${account.role}`} className="mt-5 inline-flex min-h-11 items-center text-sm font-medium">{account.name} · {t("workspace")}</Link></DrawerClose>{account.role === "traveler" ? <><DrawerClose asChild><Link href="/traveler/itineraries" className="inline-flex min-h-11 items-center text-sm font-medium">{t("myItineraries")}</Link></DrawerClose><DrawerClose asChild><Link href="/traveler/bookings" className="inline-flex min-h-11 items-center text-sm font-medium">{t("myBookings")}</Link></DrawerClose><DrawerClose asChild><Link href="/traveler/passport" className="inline-flex min-h-11 items-center text-sm font-medium">{t("culturalPassport")}</Link></DrawerClose><DrawerClose asChild><Link href="/traveler/profile" className="inline-flex min-h-11 items-center text-sm font-medium">{t("profile")}</Link></DrawerClose></> : null}<form action={logoutAction} className="mt-2"><button className="min-h-11 text-sm font-medium text-vermilion" type="submit">{t("signOut")}</button></form></> : <DrawerClose asChild><Link href="/auth/login" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium">{t("signIn")}</Link></DrawerClose>}
            <DrawerClose asChild><ButtonLink className="mt-3 w-full" href="/discover">{t("exploreJapan")}</ButtonLink></DrawerClose>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  </header>;
}
