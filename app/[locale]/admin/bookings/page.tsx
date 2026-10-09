import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdminNav } from "@/app/[locale]/admin/_components/admin-nav";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";
import { ADMIN_PAGE_SIZE, normalizeAdminPage } from "@/features/admin/policy";

export const metadata: Metadata = { title: "Booking support · MICHI admin" };
const statuses = ["pending", "confirmed", "cancelled", "completed"] as const;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] ?? "" : input ?? "";

export default async function AdminBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const statusValue = value(params.status);
  const status = statuses.find((item) => item === statusValue) ?? "";
  const page = normalizeAdminPage(value(params.page));
  const admin = await createAdminClient();
  let request = admin.from("bookings").select("id,booking_reference,experience_id,slot_id,guests,total_price_jpy,status,created_at,updated_at,experience_title_snapshot,slot_starts_at_snapshot,slot_ends_at_snapshot", { count: "exact" }).order("created_at", { ascending: false });
  if (status) request = request.eq("status", status);
  const { data: bookings, count, error } = await request.range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  const ids = [...new Set((bookings ?? []).map((booking) => booking.experience_id))];
  const { data: experiences } = await admin.from("experiences").select("id,title,destination_id").in("id", ids);
  const destinationIds = [...new Set((experiences ?? []).map((experience) => experience.destination_id))];
  const { data: destinations } = await admin.from("destinations").select("id,name").in("id", destinationIds);
  const experienceMap = new Map((experiences ?? []).map((experience) => [experience.id, experience]));
  const destinationMap = new Map((destinations ?? []).map((destination) => [destination.id, destination.name]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE));
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-6xl">
    <p className="eyebrow">Booking operations</p><h1 className="mt-3 font-serif text-4xl">Booking support</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">Read-only support view of MICHI bookings. Traveler identity, private notes, cultural requirements, acknowledgments, and payment credentials are intentionally omitted. This view cannot issue refunds or alter capacity.</p>
    <AdminNav />
    <form method="get" className="mt-5 flex items-end gap-3"><label className="grid gap-1 text-sm">Booking status<select name="status" defaultValue={status} className="min-h-11 border border-ink/20 bg-white px-3"><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button className="min-h-11 bg-ink px-4 text-sm text-white">Filter</button></form>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion p-4 text-sm">Booking records are unavailable.</p>
        : bookings?.length ? <><p className="mt-4 text-xs text-ink/55">{count ?? "Unavailable"} matching bookings · page {page} of {pages}</p><div className="mt-3 overflow-x-auto border-y border-ink/15"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white text-xs text-ink/60"><tr><th className="p-3">Reference</th><th className="p-3">Experience / destination</th><th className="p-3">Visit time</th><th className="p-3">Guests</th><th className="p-3">Recorded amount</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-ink/10">{bookings.map((booking) => { const experience = experienceMap.get(booking.experience_id); return <tr key={booking.id}><td className="p-3 font-mono">{booking.booking_reference}</td><td className="p-3">{experience?.title ?? booking.experience_title_snapshot ?? "Experience unavailable"}<span className="mt-1 block text-xs text-ink/55">{experience ? destinationMap.get(experience.destination_id) ?? "Destination unavailable" : ""}</span></td><td className="p-3">{booking.slot_starts_at_snapshot ? new Date(booking.slot_starts_at_snapshot).toLocaleString() : "Not recorded"}</td><td className="p-3">{booking.guests}</td><td className="p-3">¥{booking.total_price_jpy.toLocaleString()}</td><td className="p-3 capitalize">{booking.status}</td><td className="p-3">{new Date(booking.created_at).toLocaleDateString()}</td></tr>; })}</tbody></table></div><div className="mt-4 flex justify-between"><a className={page <= 1 ? "pointer-events-none opacity-40" : "underline"} href={`/admin/bookings?${new URLSearchParams({ ...(status ? { status } : {}), page: String(Math.max(1, page - 1)) })}`}>Previous</a><a className={page >= pages ? "pointer-events-none opacity-40" : "underline"} href={`/admin/bookings?${new URLSearchParams({ ...(status ? { status } : {}), page: String(Math.min(pages, page + 1)) })}`}>Next</a></div></>
        : <p className="mt-6 border-y border-ink/10 py-8 text-sm text-ink/60">No booking records match this filter.</p>}
  </div></WorkspaceShell>;
}
