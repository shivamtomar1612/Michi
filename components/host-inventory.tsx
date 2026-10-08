"use client";

import { useActionState } from "react";
import { approveHostExperience, changeExperiencePause, closeExperienceSlot, confirmHostBooking, declineHostBooking, createExperienceSlot, createHostExperience } from "@/features/hosts/inventory-actions";

type Destination = { id: string; name: string };
type Experience = { id: string; title: string; status: string; is_verified: boolean; is_paused: boolean; max_capacity: number };
type Slot = { id: string; experience_id: string; starts_at: string; capacity: number; booked_count: number; status: string };
type Booking = { id: string; booking_reference: string; experience_id: string; slot_id: string; guests: number; status: string };

const input = "min-h-11 border border-ink/20 bg-white px-3 font-normal";
const textarea = "border border-ink/20 bg-white p-3 font-normal";

function ExperienceDraftForm({ destinations }: { destinations: Destination[] }) {
  const [state, action, pending] = useActionState(createHostExperience, { message: "", success: false });
  return <form action={action} className="mt-5 grid gap-4">
    <label className="grid gap-1 text-sm font-semibold">Destination<select name="destinationId" required className={input}><option value="">Choose destination</option>{destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="grid gap-1 text-sm font-semibold">Experience title<input name="title" required minLength={5} maxLength={160} className={input} /></label>
    <label className="grid gap-1 text-sm font-semibold">Short description<textarea name="shortDescription" required minLength={20} maxLength={300} rows={2} className={textarea} /></label>
    <label className="grid gap-1 text-sm font-semibold">Full description<textarea name="description" required minLength={50} maxLength={5000} rows={4} className={textarea} /></label>
    <label className="grid gap-1 text-sm font-semibold">Cultural context<textarea name="culturalContext" required minLength={20} maxLength={3000} rows={3} className={textarea} /></label>
    <div className="grid gap-4 sm:grid-cols-3"><label className="grid gap-1 text-sm font-semibold">Price per guest (JPY)<input name="priceJpy" type="number" required min={0} max={2000000} className={input} /></label><label className="grid gap-1 text-sm font-semibold">Duration (minutes)<input name="durationMinutes" type="number" required min={15} max={1440} className={input} /></label><label className="grid gap-1 text-sm font-semibold">Maximum group size<input name="maxCapacity" type="number" required min={1} max={1000} className={input} /></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Languages (comma separated)<input name="languages" maxLength={300} className={input} /></label><label className="grid gap-1 text-sm font-semibold">Interests (comma separated)<input name="interests" required maxLength={300} placeholder="craft, ceramics" className={input} /></label></div>
    <label className="grid gap-1 text-sm font-semibold">Participation rules<textarea name="participationRules" required minLength={10} maxLength={3000} rows={3} className={textarea} /></label>
    <label className="grid gap-1 text-sm font-semibold">Cancellation rules<textarea name="cancellationRules" required minLength={10} maxLength={3000} rows={3} className={textarea} /></label>
    <label className="grid gap-1 text-sm font-semibold">Accessibility details, including unknowns<textarea name="accessibilityNotes" required minLength={2} maxLength={3000} rows={3} className={textarea} /></label>
    <div className="flex flex-wrap gap-5 text-sm"><label className="flex min-h-11 items-center gap-2"><input name="stepFree" type="checkbox" className="size-4 accent-vermilion" />Confirmed step-free access</label><label className="flex min-h-11 items-center gap-2"><input name="wheelchairAccess" type="checkbox" className="size-4 accent-vermilion" />Confirmed wheelchair access</label></div>
    <label className="grid gap-1 text-sm font-semibold">Photography policy<select name="photographyPolicy" className={input}><option value="ask_host">Ask the host</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option></select></label>
    <label className="grid gap-1 text-sm font-semibold">Meeting point<input name="meetingPoint" required minLength={3} maxLength={300} className={input} /></label>
    <button type="submit" disabled={pending || !destinations.length} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save listing for review"}</button>
    {state.message ? <p role="status" className={state.success ? "text-sm text-moss" : "text-sm text-vermilion"}>{state.message}</p> : null}
  </form>;
}

function SlotForm({ experiences }: { experiences: Experience[] }) {
  const [state, action, pending] = useActionState(createExperienceSlot, { message: "", success: false });
  return <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Experience<select name="experienceId" required className={input}><option value="">Choose your listing</option>{experiences.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    <label className="grid gap-1 text-sm font-semibold">Starts (Japan time)<input name="startsAt" type="datetime-local" required className={input} /></label>
    <label className="grid gap-1 text-sm font-semibold">Ends (Japan time)<input name="endsAt" type="datetime-local" required className={input} /></label>
    <label className="grid gap-1 text-sm font-semibold">Real capacity<input name="capacity" type="number" min={1} max={1000} required className={input} /></label>
    <div className="sm:col-span-2"><button type="submit" disabled={pending || !experiences.length} className="min-h-11 bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Add dated slot"}</button></div>
    {state.message ? <p role="status" className={`sm:col-span-2 ${state.success ? "text-sm text-moss" : "text-sm text-vermilion"}`}>{state.message}</p> : null}
  </form>;
}

function PauseForm({ item }: { item: Experience }) {
  const [state, action, pending] = useActionState(changeExperiencePause, { message: "", success: false });
  return <form action={action} className="mt-3"><input type="hidden" name="experienceId" value={item.id} /><input type="hidden" name="pause" value={String(!item.is_paused)} /><button type="submit" disabled={pending || !item.is_verified} className="min-h-11 border border-ink/25 px-4 text-sm font-semibold disabled:opacity-50">{item.is_paused ? "Resume recommendations" : "Pause recommendations"}</button>{state.message ? <p role="status" className="mt-2 text-xs">{state.message}</p> : null}</form>;
}

function CloseSlotForm({ slotId }: { slotId: string }) {
  const [state, action, pending] = useActionState(closeExperienceSlot, { message: "", success: false });
  return <form action={action}><input type="hidden" name="slotId" value={slotId} /><button type="submit" disabled={pending} className="min-h-11 text-xs font-semibold text-vermilion underline disabled:opacity-50">Close to new requests</button>{state.message ? <p role="status" className="text-xs">{state.message}</p> : null}</form>;
}

function ConfirmForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(confirmHostBooking, { message: "", success: false });
  return <form action={action}><input type="hidden" name="bookingId" value={bookingId} /><button type="submit" disabled={pending} className="min-h-11 text-xs font-semibold text-vermilion underline disabled:opacity-50">Confirm request</button>{state.message ? <p role="status" className="text-xs">{state.message}</p> : null}</form>;
}

function DeclineForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(declineHostBooking, { message: "", success: false });
  return <form action={action}>
    <input type="hidden" name="bookingId" value={bookingId} />
    <button type="submit" disabled={pending} className="min-h-11 text-xs font-semibold text-ink/65 underline disabled:opacity-50">Decline request</button>
    {state.message ? <p role="status" className="text-xs">{state.message}</p> : null}
  </form>;
}

export function HostInventory({ destinations, experiences, slots, bookings }: { destinations: Destination[]; experiences: Experience[]; slots: Slot[]; bookings: Booking[] }) {
  return <div className="mt-10 space-y-12">
    <section aria-labelledby="host-experiences"><h2 id="host-experiences" className="font-serif text-2xl">Your experiences</h2>
      {experiences.length ? <div className="mt-4 grid gap-4">{experiences.map((item) => <article key={item.id} className="border border-ink/15 bg-white p-5"><h3 className="font-serif text-xl">{item.title}</h3><p className="mt-1 text-xs text-ink/60">{item.status} · {item.is_verified ? "MICHI reviewed" : "Awaiting MICHI review"} · {item.is_paused ? "recommendations paused" : "visible when eligible"}</p><PauseForm item={item} /></article>)}</div> : <p className="mt-3 text-sm text-ink/65">No host listing yet. Create a draft below.</p>}
      <details className="mt-6 border-t border-ink/15 pt-4"><summary className="min-h-11 cursor-pointer font-semibold">Create an experience draft</summary><ExperienceDraftForm destinations={destinations} /></details>
    </section>
    <section aria-labelledby="host-slots"><h2 id="host-slots" className="font-serif text-2xl">Dated availability</h2><p className="mt-2 text-sm text-ink/65">Only enter capacity you can genuinely host. Closing a slot preserves existing bookings.</p>
      {slots.length ? <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{slots.map((slot) => <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(slot.starts_at))} · {slot.booked_count}/{slot.capacity} reserved · {slot.status}</span>{slot.status === "open" ? <CloseSlotForm slotId={slot.id} /> : null}</li>)}</ul> : <p className="mt-3 text-sm text-ink/65">No real dated slots entered.</p>}
      <details className="mt-6 border-t border-ink/15 pt-4"><summary className="min-h-11 cursor-pointer font-semibold">Add a slot</summary><SlotForm experiences={experiences} /></details>
    </section>
    <section aria-labelledby="host-bookings"><h2 id="host-bookings" className="font-serif text-2xl">Booking requests</h2>
      {bookings.length ? <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{bookings.map((booking) => <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>Reference {booking.booking_reference} · {booking.guests} guests · {booking.status}</span>{booking.status === "pending" ? <div className="flex items-center gap-4"><ConfirmForm bookingId={booking.id} /><DeclineForm bookingId={booking.id} /></div> : null}</li>)}</ul> : <p className="mt-3 text-sm text-ink/65">No booking requests yet.</p>}
    </section>
  </div>;
}

export function ExperienceApprovalForm({ experienceId }: { experienceId: string }) {
  const [state, action, pending] = useActionState(approveHostExperience, { message: "", success: false });
  return <form action={action} className="mt-3"><input type="hidden" name="experienceId" value={experienceId} /><button type="submit" disabled={pending} className="min-h-11 bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">Approve and publish listing</button>{state.message ? <p role="status" className="mt-2 text-xs">{state.message}</p> : null}</form>;
}
