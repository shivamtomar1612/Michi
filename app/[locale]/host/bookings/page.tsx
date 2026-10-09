import type { Metadata } from "next";
import { HostBookingDecision } from "@/components/host-platform";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import type { Json } from "@/types/database";

export const metadata: Metadata = { title: "Bookings · Host workspace" };

export default async function HostBookingsPage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const { data: experiences, error: experienceError } = await supabase.from("experiences").select("id,title")
    .eq("host_id", user.id);
  const ids = (experiences ?? []).map((item) => item.id);
  const [bookingResult, slotResult] = ids.length ? await Promise.all([
    supabase.from("bookings").select("id,booking_reference,experience_id,slot_id,guests,status,total_price_jpy,cultural_requirements,rule_acknowledgment,created_at").in("experience_id", ids).order("created_at", { ascending: false }).limit(500),
    supabase.from("experience_slots").select("id,starts_at,ends_at").in("experience_id", ids).order("starts_at", { ascending: false }).limit(500),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  const hasError = experienceError || bookingResult.error || slotResult.error;
  const titleById = new Map((experiences ?? []).map((item) => [item.id, item.title]));
  const slotById = new Map((slotResult.data ?? []).map((item) => [item.id, item]));
  const groups = ["pending", "confirmed", "completed", "cancelled"];
  return <div className="mx-auto max-w-5xl"><p className="eyebrow">Visitor management</p><h1 className="mt-3 font-serif text-4xl">Bookings</h1><p className="mt-3 text-sm text-ink/60">Visitor names and private traveler details are not shown here.</p>
    {hasError ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Booking information could not be loaded.</p> : (bookingResult.data ?? []).length ? <div className="mt-8 space-y-10">{groups.map((group) => {
      const items = (bookingResult.data ?? []).filter((booking) => booking.status === group);
      if (!items.length) return null;
      return <section key={group} aria-labelledby={`bookings-${group}`}><h2 id={`bookings-${group}`} className="border-b border-ink/15 pb-3 font-serif text-2xl capitalize">{group} <span className="font-sans text-sm text-ink/50">{items.length}</span></h2><ul className="divide-y divide-ink/10">{items.map((booking) => {
        const slot = slotById.get(booking.slot_id);
        const requirements = booking.cultural_requirements && typeof booking.cultural_requirements === "object" && !Array.isArray(booking.cultural_requirements)
          ? Object.entries(booking.cultural_requirements).filter(([, value]) => typeof value === "string" && value.trim()) : [];
        const acknowledgment = booking.rule_acknowledgment as Json;
        const acknowledged = typeof acknowledgment === "object" && acknowledgment !== null && !Array.isArray(acknowledgment) && acknowledgment.acknowledged === true;
        const visitStarted = !!slot && new Date(slot.starts_at) <= new Date();
        return <li key={booking.id} className="grid gap-4 border-b border-ink/10 py-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><p className="text-xs text-ink/55">Reference {booking.booking_reference}</p><h3 className="mt-1 font-semibold">{titleById.get(booking.experience_id) ?? "Experience"}</h3><p className="mt-1 text-sm text-ink/65">{booking.guests} guests · {slot ? new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(slot.starts_at)) : "Slot time unavailable"} · ¥{booking.total_price_jpy.toLocaleString("en-US")}</p>
          {acknowledged ? <p className="mt-2 text-xs text-moss">Traveler acknowledged the host rules</p> : null}
          {requirements.length ? <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-[auto_1fr]">{requirements.map(([key, value]) => <div key={key} className="contents"><dt className="font-semibold capitalize text-ink/55">{key.replaceAll("_", " ")}</dt><dd className="text-ink/75">{String(value)}</dd></div>)}</dl> : null}
        </div>{booking.status === "pending" ? <div className="flex flex-wrap gap-x-3"><HostBookingDecision bookingId={booking.id} decision="confirm" /><HostBookingDecision bookingId={booking.id} decision="decline" /></div>
          : booking.status === "confirmed" ? <div className="flex flex-wrap gap-x-3">{visitStarted ? <HostBookingDecision bookingId={booking.id} decision="complete" /> : null}<HostBookingDecision bookingId={booking.id} decision="cancel" /></div> : null}</li>;
      })}</ul></section>;
    })}</div> : <section className="mt-8 border-y border-ink/15 py-12"><h2 className="font-serif text-2xl">No bookings yet</h2><p className="mt-2 text-sm text-ink/60">Requests will appear here when travelers book an available MICHI slot.</p></section>}
  </div>;
}
