import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EmptyState } from "@/components/ui/states";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { TravelerBookingActions } from "@/components/traveler-booking-actions";
import { ExperienceReflectionForm } from "@/components/experience-reflection-form";

export const metadata: Metadata = { title: "My bookings" };

export default async function TravelerBookingsPage() {
  const { user } = await requireRole(["traveler"]);
  const supabase = await createClient();
  const { data: bookings, error } = await supabase.from("bookings")
    .select("id,booking_reference,status,guests,total_price_jpy,created_at,experience_id,experience_title_snapshot,slot_starts_at_snapshot,slot_ends_at_snapshot")
    .eq("traveler_id", user.id).order("created_at", { ascending: false }).limit(50);
  const completedIds = (bookings ?? []).filter((booking) => booking.status === "completed").map((booking) => booking.id);
  const feedbackResult = completedIds.length
    ? await supabase.from("traveler_feedback").select("booking_id").in("booking_id", completedIds)
    : { data: [], error: null };
  const reflectedBookingIds = new Set((feedbackResult.data ?? []).map((item) => item.booking_id));
  return <WorkspaceShell role="Traveler" basePath="/traveler"><div className="mx-auto max-w-4xl">
    <p className="eyebrow">Traveler account</p><h1 className="mt-3 font-serif text-4xl">My bookings</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">Booking requests and confirmations made through MICHI are private to your account. External operator reservations remain with that operator.</p>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion bg-[#fbf1ed] p-4 text-sm">Your bookings could not be loaded. Please try again later.</p>
      : bookings?.length ? <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">{bookings.map((booking) => <li key={booking.id} className="py-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">{booking.experience_title_snapshot ?? "MICHI experience"}</p><p className="mt-1 text-xs text-ink/60">{booking.booking_reference}</p><p className="mt-1 text-xs text-ink/55">{booking.slot_starts_at_snapshot ? new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.slot_starts_at_snapshot)) : new Date(booking.created_at).toLocaleDateString()} · {booking.guests} guest{booking.guests === 1 ? "" : "s"}</p></div><div className="text-right"><p className="text-sm font-semibold capitalize">{booking.status.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-ink/55">¥{booking.total_price_jpy.toLocaleString("ja-JP")}</p>{["pending", "confirmed"].includes(booking.status) ? <TravelerBookingActions bookingId={booking.id} /> : null}</div></div>{booking.status === "completed" ? feedbackResult.error ? <p role="alert" className="mt-4 text-sm text-vermilion">Reflection status could not be loaded. Refresh this page before submitting.</p> : <ExperienceReflectionForm bookingId={booking.id} saved={reflectedBookingIds.has(booking.id)} /> : null}</li>)}</ul>
      : <div className="mt-8"><EmptyState title="No MICHI bookings yet" description="When you make a booking with a verified MICHI host, its status will appear here. External operator bookings are managed on the operator’s site." /><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-vermilion underline underline-offset-4" href="/discover">Explore Japan</Link></div>}
  </div></WorkspaceShell>;
}
