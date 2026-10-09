import { redirect } from "@/i18n/navigation";
import { requireRole } from "@/server/auth/guards";

export default async function SavedItinerariesPage({ params }: { params: Promise<{ locale: "en" | "ja" }> }) {
  const { locale } = await params;
  await requireRole(["traveler"]);
  redirect({ href: "/traveler/plan#saved-plans-title", locale });
}
