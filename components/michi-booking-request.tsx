"use client";

import { useState, type FormEvent } from "react";
import { ProgressiveAuthDialog } from "@/components/progressive-auth-dialog";

type Slot = { id: string; starts_at: string; ends_at: string; capacity: number; booked_count: number; status: string };
function dateLabel(value: string) { return new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" }).format(new Date(value)); }

export function MichiBookingRequest({ slots, experienceTitle, returnPath }: { slots: Slot[]; experienceTitle: string; returnPath: string }) {
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [guestCount, setGuestCount] = useState(1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [requirements, setRequirements] = useState({ dietary: "", accessibility: "", language: "", participation: "" });
  const available = slots.filter((slot) => slot.status === "open" && slot.booked_count < slot.capacity);
  const selected = available.find((slot) => slot.id === slotId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId, guests: guestCount, acknowledged: true, notes: "", culturalRequirements: requirements }),
      });
      const result = await response.json() as { error?: string; bookingReference?: string };
      if (response.status === 401) { setAuthOpen(true); return; }
      if (!response.ok) throw new Error(result.error ?? "This request could not be completed.");
      setMessage(`Request ${result.bookingReference ? `#${result.bookingReference} ` : ""}sent. The host will review it; your visit is not confirmed yet.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Booking service is temporarily unavailable.");
    } finally { setPending(false); }
  }
  return <>
    {available.length ? <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-3 border-t border-ink/10 pt-5">
      <h3 className="font-serif text-xl">Request a place</h3><p className="text-xs leading-5 text-ink/55">Review the actual host dates and capacity. Sign-in is needed only when you send the request.</p>
      <label className="grid gap-1.5 text-xs font-semibold">Available date<select value={slotId} onChange={(event) => setSlotId(event.target.value)} required className="min-h-11 border border-ink/20 bg-white px-3 text-sm">{available.map((slot) => <option key={slot.id} value={slot.id}>{dateLabel(slot.starts_at)} · {slot.capacity - slot.booked_count} places available</option>)}</select></label>
      <label className="grid max-w-xs gap-1.5 text-xs font-semibold">Guests<input type="number" min={1} max={Math.min(100, selected ? selected.capacity - selected.booked_count : 1)} value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} required className="min-h-11 border border-ink/20 px-3 text-sm" /></label>
      <details className="border-t border-ink/10 pt-3"><summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold">Cultural and access requirements (optional)</summary><div className="grid gap-3 pt-2 sm:grid-cols-2">
        {([
          ["dietary", "Dietary needs"], ["accessibility", "Access needs"], ["language", "Language support"], ["participation", "Participation needs"],
        ] as const).map(([key, label]) => <label key={key} className="grid gap-1 text-xs font-semibold">{label}<input value={requirements[key]} maxLength={250} onChange={(event) => setRequirements((current) => ({ ...current, [key]: event.target.value }))} className="min-h-10 border border-ink/20 px-3 text-sm font-normal" /></label>)}
      </div><p className="mt-2 text-xs leading-5 text-ink/55">Only share what this host needs to prepare. Avoid medical or highly sensitive information. These details are shared with the host for this booking.</p></details>
      <label className="flex min-h-11 items-start gap-2 text-xs leading-5"><input type="checkbox" required className="mt-1 size-4 accent-vermilion" />I have read the participation, photography, and cancellation terms on this page.</label>
      <button type="submit" disabled={pending || !selected || guestCount < 1 || guestCount > Math.min(100, selected?.capacity ? selected.capacity - selected.booked_count : 1)} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending request…" : "Send booking request"}</button>
      {message ? <p role="status" className="text-sm text-ink/70">{message}</p> : null}
    </form> : <div className="mt-5 border-t border-ink/10 pt-5"><h3 className="font-serif text-xl">No available dates</h3><p className="mt-2 text-sm leading-6 text-ink/60">The host has not published open capacity. MICHI does not accept requests without an available slot.</p></div>}
    <ProgressiveAuthDialog open={authOpen} onOpenChange={setAuthOpen} nextPath={returnPath} title="Sign in to request this experience." description={`You can review ${experienceTitle} and its actual host availability first. A traveler account is required to send a booking request.`} />
  </>;
}
