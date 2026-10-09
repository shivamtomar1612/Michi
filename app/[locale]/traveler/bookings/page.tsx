import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EmptyState } from "@/components/ui/states";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { TravelerBookingActions } from "@/components/traveler-booking-actions";
import { ExperienceReflectionForm } from "@/components/experience-reflection-form";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

export const metadata: Metadata = { title: "My bookings" };

export default async function TravelerBookingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Bookings" });
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
    <p className="eyebrow">{t("eyebrow")}</p><h1 className="mt-3 font-serif text-4xl">{t("title")}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">{t("description")}</p>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion bg-[#fbf1ed] p-4 text-sm">{t("loadError")}</p>
      : bookings?.length ? <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">{bookings.map((booking) => <li key={booking.id} className="py-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">{booking.experience_title_snapshot ?? t("noExperience")}</p><p className="mt-1 text-xs text-ink/60">{booking.booking_reference}</p><p className="mt-1 text-xs text-ink/55">{booking.slot_starts_at_snapshot ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.slot_starts_at_snapshot)) : new Intl.DateTimeFormat(locale, { timeZone: "Asia/Tokyo", dateStyle: "medium" }).format(new Date(booking.created_at))} · {booking.guests} {booking.guests === 1 ? t("guest") : t("guests")}</p></div><div className="text-right"><p className="text-sm font-semibold capitalize">{booking.status.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-ink/55">{new Intl.NumberFormat(locale, { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(booking.total_price_jpy)}</p>{["pending", "confirmed"].includes(booking.status) ? <TravelerBookingActions bookingId={booking.id} /> : null}</div></div>{booking.status === "completed" ? feedbackResult.error ? <p role="alert" className="mt-4 text-sm text-vermilion">{t("reflectionLoadError")}</p> : <ExperienceReflectionForm bookingId={booking.id} saved={reflectedBookingIds.has(booking.id)} /> : null}</li>)}</ul>
      : <div className="mt-8"><EmptyState title={t("emptyTitle")} description={t("emptyDescription")} /><Link className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-vermilion underline underline-offset-4" href="/discover">{t("explore")}</Link></div>}
  </div></WorkspaceShell>;
}
