import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HostExperienceForm, HostExperienceStatus, HostSlotRow, NewSlotForm } from "@/components/host-platform";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

type Props = { params: Promise<{ id: string }> };
export const metadata: Metadata = { title: "Edit experience · Host workspace" };

export default async function HostExperienceDetailPage({ params }: Props) {
  const { user } = await requireRole(["host"]);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: item, error }, slotsResult, destinationsResult] = await Promise.all([
    supabase.from("experiences").select("*").eq("id", id).eq("host_id", user.id).maybeSingle(),
    supabase.from("experience_slots").select("id,experience_id,starts_at,ends_at,capacity,booked_count,status").eq("experience_id", id).order("starts_at", { ascending: false }).limit(100),
    supabase.from("destinations").select("id,name").eq("status", "published").order("name"),
  ]);
  if (error || !item) notFound();
  const experience = { ...item, rules: item.rules as Record<string, unknown>, booking_policy: item.booking_policy as Record<string, unknown>, accessibility: item.accessibility as Record<string, unknown>, image_paths: item.image_paths ?? [] };
  return <div className="mx-auto max-w-5xl space-y-10">
    <div><Link href="/host/experiences" className="text-xs font-semibold text-ink/55 underline underline-offset-4">All experiences</Link><p className="eyebrow mt-7">Experience details</p><h1 className="mt-3 font-serif text-4xl">{item.title}</h1><p className="mt-2 text-sm text-ink/60">Update your listing, review status, and genuine availability.</p></div>
    <HostExperienceStatus experience={experience} />
    <section><h2 className="mb-5 font-serif text-2xl">Listing details</h2><HostExperienceForm destinations={destinationsResult.data ?? []} hostId={user.id} experience={experience} /></section>
    <section className="border-t border-ink/15 pt-8"><h2 className="font-serif text-2xl">Availability</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Slots are real dated capacity. Reducing capacity below reservations is blocked, and closing a slot preserves confirmed bookings.</p>
      {slotsResult.error ? <p role="alert" className="mt-5 text-sm text-vermilion">Availability could not be loaded.</p> : slotsResult.data?.length ? <ul className="mt-5 divide-y divide-ink/10 border-y border-ink/10">{slotsResult.data.map((slot) => <HostSlotRow key={slot.id} slot={slot} />)}</ul> : <p className="mt-4 border-y border-ink/10 py-5 text-sm text-ink/60">No date-specific slots have been added.</p>}
      {item.status !== "archived" ? <div className="mt-7"><h3 className="mb-4 font-semibold">Add a slot</h3><NewSlotForm experiences={[experience]} /></div> : <p className="mt-5 text-sm text-ink/55">Archived experiences cannot receive new availability.</p>}
    </section>
  </div>;
}
