import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, Compass, Store, Users } from "lucide-react";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Host workspace" };
const stat = "border-t-2 border-ink/80 py-4";
const routes = [
  { href: "/host/experiences", label: "Manage experiences", text: "Edit listings, availability, and recommendation visibility.", icon: Store },
  { href: "/host/bookings", label: "Manage bookings", text: "Review visitor requests and confirmed visits.", icon: CalendarDays },
  { href: "/host/analytics", label: "View impact", text: "Review guest outcomes and capacity use with honest data limits.", icon: ChartNoAxesCombined },
  { href: "/host/community", label: "Community input", text: "Share host observations and see reports linked to your work.", icon: Users },
];

export default async function HostPage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const { data: experiences, error: experiencesError } = await supabase.from("experiences")
    .select("id,title,status,is_verified,is_paused,max_capacity,price_jpy,destination_id")
    .eq("host_id", user.id).order("created_at", { ascending: false });
  const ids = (experiences ?? []).map((item) => item.id);
  const [slotResult, bookingResult, communityResult] = ids.length ? await Promise.all([
    supabase.from("experience_slots").select("id,experience_id,starts_at,ends_at,capacity,booked_count,status").in("experience_id", ids).gte("starts_at", new Date().toISOString()).order("starts_at").limit(500),
    supabase.from("bookings").select("id,experience_id,guests,status,total_price_jpy,slot_id").in("experience_id", ids).order("created_at", { ascending: false }).limit(1000),
    supabase.from("community_feedback").select("pressure_score,sentiment,created_at").eq("host_id", user.id).order("created_at", { ascending: false }).limit(500),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const slots = slotResult.data ?? [];
  const bookings = bookingResult.data ?? [];
  const feedbackResult = bookings.length ? await supabase.from("traveler_feedback").select("booking_id,host_rating,cultural_depth_score,understanding_score,preparation_helpfulness").in("booking_id", bookings.map((booking) => booking.id)) : { data: [], error: null };
  const hasError = experiencesError || slotResult.error || bookingResult.error || communityResult.error || feedbackResult.error;
  const feedback = feedbackResult.data ?? [];
  const activeCount = (experiences ?? []).filter((item) => item.status === "published" && item.is_verified && !item.is_paused).length;
  const upcomingBookings = bookings.filter((booking) => ["pending", "confirmed"].includes(booking.status) && slots.some((slot) => slot.id === booking.slot_id));
  const upcomingVisitors = upcomingBookings.reduce((total, booking) => total + booking.guests, 0);
  const grossProxy = bookings.filter((booking) => ["confirmed", "completed"].includes(booking.status)).reduce((total, booking) => total + booking.total_price_jpy, 0);
  const openSlots = slots.filter((slot) => slot.status === "open" || slot.status === "full");
  const capacity = openSlots.reduce((sum, slot) => sum + slot.capacity, 0);
  const reserved = openSlots.reduce((sum, slot) => sum + slot.booked_count, 0);
  const utilization = capacity ? Math.round(reserved / capacity * 100) : null;
  const pressureRecords = (communityResult.data ?? []).filter((feedback) => feedback.pressure_score !== null);
  const pressureAverage = pressureRecords.length ? Math.round(pressureRecords.reduce((sum, item) => sum + Number(item.pressure_score), 0) / pressureRecords.length) : null;
  return <div className="mx-auto max-w-6xl">
    <p className="eyebrow">Community host workspace</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">Share on your own terms.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/65">Control what you offer, when you welcome visitors, and how your cultural context is shared. Pausing recommendations never cancels confirmed bookings.</p>
    {hasError ? <p role="alert" className="mt-8 border-l-2 border-vermilion bg-vermilion/5 p-4 text-sm">Some host information could not be loaded. Refresh the page, or contact support if the issue continues.</p> : <>
      <section aria-labelledby="host-overview-stats" className="mt-10 border-y border-ink/15 py-6"><h2 id="host-overview-stats" className="sr-only">Host overview metrics</h2><div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Active experiences" value={String(activeCount)} detail={`${experiences?.length ?? 0} total listings`} />
        <Metric label="Future booking requests and visits" value={String(upcomingBookings.length)} detail={`${upcomingVisitors} reserved guest places`} />
        <Metric label="Gross booking value proxy" value={`¥${grossProxy.toLocaleString("en-US")}`} detail="Confirmed and completed bookings; not a payout estimate" />
        <Metric label="Future capacity used" value={utilization === null ? "—" : `${utilization}%`} detail={capacity ? `${reserved} reserved of ${capacity} published places` : "No upcoming slots entered"} />
        <Metric label="Community pressure reports" value={pressureAverage === null ? "—" : `${pressureAverage}/100`} detail={`${pressureRecords.length} host-linked observations; no report is not a zero`} />
        <Metric label="Guest rating" value={feedback.length ? `${(feedback.reduce((sum, item) => sum + item.host_rating, 0) / feedback.length).toFixed(1)}/5` : "—"} detail={feedback.length ? `${feedback.length} private feedback forms; only score summaries shown` : "Ratings appear after verified booking feedback is available"} />
      </div></section>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/host/experiences/new" className="inline-flex min-h-11 items-center gap-2 bg-ink px-5 text-sm font-semibold text-white">Create an experience <ArrowRight className="size-4" /></Link><Link href="/discover" className="inline-flex min-h-11 items-center gap-2 border border-ink/20 px-5 text-sm font-semibold"><Compass className="size-4" />Preview public discovery</Link></div>
      <section className="mt-12 grid gap-x-10 border-t border-ink/15 sm:grid-cols-2">{routes.map(({ href, label, text, icon: Icon }) => <Link key={href} href={href} className="group flex min-h-28 items-start gap-4 border-b border-ink/15 py-6 focus-visible:outline-2 focus-visible:outline-vermilion"><Icon className="mt-1 size-5 shrink-0 text-vermilion" aria-hidden="true" /><span><span className="flex items-center gap-2 font-serif text-xl">{label}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span><span className="mt-2 block text-sm leading-6 text-ink/60">{text}</span></span></Link>)}</section>
      <p className="mt-8 text-xs leading-5 text-ink/55">Metrics use your booking and host-report records. Booking value is an activity proxy; it does not represent settlement, fees, or income.</p>
    </>}
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className={stat}><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p><p className="mt-1 text-xs leading-5 text-ink/55">{detail}</p></div>;
}
