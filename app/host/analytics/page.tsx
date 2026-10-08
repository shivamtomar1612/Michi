import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Analytics · Host workspace" };

export default async function HostAnalyticsPage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const { data: experiences, error } = await supabase.from("experiences").select("id,title,status,is_verified,is_paused,max_capacity")
    .eq("host_id", user.id).order("created_at", { ascending: false });
  const ids = (experiences ?? []).map((item) => item.id);
  const [slotsResult, bookingsResult, communityResult] = ids.length ? await Promise.all([
    supabase.from("experience_slots").select("id,experience_id,starts_at,capacity,booked_count,status").in("experience_id", ids).gte("starts_at", new Date().toISOString()).limit(1000),
    supabase.from("bookings").select("id,experience_id,guests,status,total_price_jpy,slot_id,created_at").in("experience_id", ids).order("created_at", { ascending: false }).limit(1000),
    supabase.from("community_feedback").select("pressure_score,sentiment,created_at").eq("host_id", user.id).order("created_at", { ascending: false }).limit(500),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const bookingIds = (bookingsResult.data ?? []).map((item) => item.id);
  const ratingsResult = bookingIds.length ? await supabase.from("traveler_feedback").select("booking_id,host_rating,cultural_depth_score,understanding_score,preparation_helpfulness").in("booking_id", bookingIds) : { data: [], error: null };
  const hasError = error || slotsResult.error || bookingsResult.error || communityResult.error || ratingsResult.error;
  const slots = slotsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];
  const ratings = ratingsResult.data ?? [];
  const gross = bookings.filter((item) => ["confirmed", "completed"].includes(item.status)).reduce((sum, item) => sum + item.total_price_jpy, 0);
  const capacitySlots = slots.filter((item) => item.status === "open" || item.status === "full");
  const capacity = capacitySlots.reduce((sum, item) => sum + item.capacity, 0);
  const guests = capacitySlots.reduce((sum, item) => sum + item.booked_count, 0);
  const pressure = (communityResult.data ?? []).filter((item) => item.pressure_score !== null);
  const avgPressure = pressure.length ? pressure.reduce((sum, item) => sum + Number(item.pressure_score), 0) / pressure.length : null;
  return <div className="mx-auto max-w-6xl"><p className="eyebrow">Your impact and operations</p><h1 className="mt-3 font-serif text-4xl">Analytics</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">Only records tied to your host account are included. MICHI does not infer visitor pressure, income, or ratings when source records are missing.</p>
    {hasError ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Analytics could not be loaded.</p> : <>
      <section aria-label="Host performance summaries" className="mt-8 grid gap-x-8 gap-y-5 border-y border-ink/15 py-6 sm:grid-cols-2 xl:grid-cols-3">
        <Summary label="Active experiences" value={String((experiences ?? []).filter((item) => item.status === "published" && item.is_verified && !item.is_paused).length)} detail={`${experiences?.length ?? 0} total`} />
        <Summary label="Future guest capacity" value={capacity ? `${guests}/${capacity}` : "—"} detail={capacity ? `${Math.round(guests / capacity * 100)}% reserved across upcoming slots` : "No upcoming slots"} />
        <Summary label="Gross booking value proxy" value={`¥${gross.toLocaleString("en-US")}`} detail="Confirmed and completed booking totals; not host earnings" />
        <Summary label="Guest feedback" value={ratings.length ? `${(ratings.reduce((sum, item) => sum + item.host_rating, 0) / ratings.length).toFixed(1)}/5` : "—"} detail={`${ratings.length} submitted score forms; comments are excluded`} />
        <Summary label="Cultural understanding" value={ratings.length ? `${(ratings.reduce((sum, item) => sum + item.understanding_score, 0) / ratings.length).toFixed(1)}/5` : "—"} detail="Traveler reported; no rating is not a zero" />
        <Summary label="Community pressure reports" value={avgPressure === null ? "—" : `${avgPressure.toFixed(0)}/100`} detail={`${pressure.length} host-linked records; sourced by host report`} />
      </section>
      <section className="mt-10"><h2 className="font-serif text-2xl">Experience performance</h2><div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{(experiences ?? []).map((experience) => {
        const experienceSlots = slots.filter((slot) => slot.experience_id === experience.id);
        const experienceBookings = bookings.filter((booking) => booking.experience_id === experience.id && ["confirmed", "completed"].includes(booking.status));
        const experienceRatings = ratings.filter((rating) => experienceBookings.some((booking) => booking.id === rating.booking_id));
        return <article key={experience.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><h3 className="font-semibold">{experience.title}</h3><p className="mt-1 text-xs text-ink/55">{experience.status} · {experience.is_paused ? "recommendations paused" : "recommendation visibility on"}</p></div><p className="text-sm text-ink/65">{experienceSlots.reduce((sum, slot) => sum + slot.booked_count, 0)} future seats · {experienceBookings.length} confirmed/completed · {experienceRatings.length ? `${(experienceRatings.reduce((sum, rating) => sum + rating.host_rating, 0) / experienceRatings.length).toFixed(1)} average rating` : "no ratings yet"}</p></article>;
      })}{!experiences?.length ? <p className="py-6 text-sm text-ink/55">Create an experience to start collecting operational data.</p> : null}</div></section>
      <p className="mt-8 text-xs leading-5 text-ink/55">Data is limited to the available database window and currently loaded rows. Revenue is a gross booking value proxy; community pressure reflects host-linked observations, not a live measure of residents or crowds.</p>
    </>}
  </div>;
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-t-2 border-ink/80 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p><p className="mt-1 text-xs leading-5 text-ink/55">{detail}</p></div>;
}
