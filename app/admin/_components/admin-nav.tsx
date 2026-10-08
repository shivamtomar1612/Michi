import Link from "next/link";

const links = [
  ["Overview", "/admin"],
  ["Users", "/admin/users"],
  ["Destinations", "/admin/destinations"],
  ["Bookings", "/admin/bookings"],
  ["Reports", "/admin/reports"],
  ["Cultural knowledge", "/admin/knowledge"],
  ["Destination access", "/admin/dmo-access"],
  ["Community review", "/admin/community-feedback"],
  ["Audit history", "/admin/audit"],
] as const;

export function AdminNav() {
  return <nav aria-label="Admin sections" className="mt-5 flex flex-wrap gap-2 border-y border-ink/10 py-3">
    {links.map(([label, href]) => <Link key={href} href={href} className="inline-flex min-h-10 items-center border border-ink/20 px-3 text-sm underline underline-offset-4 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion">{label}</Link>)}
  </nav>;
}
