import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/guards";

export default async function SavedItinerariesPage() {
  await requireRole(["traveler"]);
  redirect("/traveler/plan#saved-plans-title");
}
