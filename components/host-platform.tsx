"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Archive, Camera, Check, Pause, Play, Plus, RotateCcw, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { changeHostExperienceState, changeHostSlot, saveHostExperience, submitHostCommunityFeedback, updateHostSettings } from "@/features/hosts/platform-actions";
import { createExperienceSlot, confirmHostBooking, declineHostBooking, cancelHostBooking, completeHostBooking } from "@/features/hosts/inventory-actions";
import type { HostActionState } from "@/features/hosts/actions";

const initial: HostActionState = { message: "", success: false };
const field = "min-h-11 w-full border border-ink/20 bg-white px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion";
const textarea = "w-full border border-ink/20 bg-white p-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion";

type Destination = { id: string; name: string };
type Experience = {
  id: string; destination_id: string; title: string; slug: string; short_description: string; description: string;
  cultural_context: string; price_jpy: number; duration_minutes: number; max_capacity: number; languages: string[];
  interests: string[]; rules: Record<string, unknown>; booking_policy: Record<string, unknown>; accessibility: Record<string, unknown>;
  photography_policy: string; meeting_point: string; latitude: number | null; longitude: number | null;
  image_paths: string[]; status: string; is_verified: boolean; is_paused: boolean;
};
type Slot = { id: string; experience_id: string; starts_at: string; ends_at: string; capacity: number; booked_count: number; status: string };

function ActionMessage({ state }: { state: HostActionState }) {
  return state.message ? <p role="status" className={`mt-3 text-sm ${state.success ? "text-moss" : "text-vermilion"}`}>{state.message}</p> : null;
}

function HostStateButton({ id, state: actionName, label, icon: Icon }: { id: string; state: string; label: string; icon: typeof Pause }) {
  const [state, action, pending] = useActionState(changeHostExperienceState, initial);
  return <form action={action} className="inline-grid justify-items-start gap-1">
    <input type="hidden" name="experienceId" value={id} /><input type="hidden" name="state" value={actionName} />
    <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 border border-ink/20 px-3 text-xs font-semibold hover:border-vermilion disabled:opacity-50"><Icon className="size-3.5" aria-hidden="true" />{pending ? "Saving…" : label}</button>
    <ActionMessage state={state} />
  </form>;
}

function ExperienceControls({ experience }: { experience: Experience }) {
  return <div className="flex flex-wrap gap-2">
    {experience.is_paused
      ? <HostStateButton id={experience.id} state="resume" label="Resume recommendations" icon={Play} />
      : <HostStateButton id={experience.id} state="pause" label="Pause Recommendations" icon={Pause} />}
    {experience.status === "published"
      ? <HostStateButton id={experience.id} state="unpublish" label="Unpublish" icon={X} />
      : experience.status !== "archived" && experience.is_verified
        ? <HostStateButton id={experience.id} state="publish" label="Publish" icon={Check} /> : null}
    {experience.status !== "archived" ? <HostStateButton id={experience.id} state="archive" label="Archive" icon={Archive} /> : null}
  </div>;
}

function ExperienceImageEditor({ hostId, experienceId, initialPaths, onChange }: { hostId: string; experienceId: string; initialPaths: string[]; onChange(paths: string[]): void }) {
  const [paths, setPaths] = useState(initialPaths);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setMessage("");
    const chosen = Array.from(files);
    if (paths.length + chosen.length > 8) { setMessage("An experience can have up to 8 images."); return; }
    const invalid = chosen.find((file) => !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 8 * 1024 * 1024);
    if (invalid) { setMessage("Use JPEG, PNG, WebP, or AVIF images up to 8 MB each."); return; }
    setBusy(true);
    const next = [...paths];
    for (const file of chosen) {
      const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as const)[file.type as "image/jpeg" | "image/png" | "image/webp" | "image/avif"];
      const path = `${hostId}/${experienceId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("experience-images").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) { setMessage("An image could not be uploaded. Check the file and your host access, then try again."); break; }
      next.push(path);
    }
    setPaths(next); onChange(next); setBusy(false);
  }
  function remove(path: string) { const next = paths.filter((item) => item !== path); setPaths(next); onChange(next); }
  return <fieldset className="border-t border-ink/10 pt-5">
    <legend className="font-semibold">Experience images</legend>
    <p className="mt-1 text-xs leading-5 text-ink/60">JPEG, PNG, WebP or AVIF, up to 8 MB each. Images are publicly addressable as listing media. Do not upload private or sensitive photos.</p>
    <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 border border-ink/20 bg-white px-4 text-sm font-semibold focus-within:outline-2 focus-within:outline-vermilion">
      <Camera className="size-4" aria-hidden="true" />{busy ? "Uploading…" : "Add images"}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy || paths.length >= 8} onChange={(event) => void upload(event.target.files)} className="sr-only" />
    </label>
    {message ? <p role="alert" className="mt-2 text-sm text-vermilion">{message}</p> : null}
    {paths.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{paths.map((path) => {
      const src = supabase.storage.from("experience-images").getPublicUrl(path).data.publicUrl;
      return <figure key={path} className="relative aspect-[4/3] overflow-hidden bg-ink/5">
        <Image src={src} alt="Uploaded experience image" fill unoptimized sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
        <button type="button" onClick={() => remove(path)} className="absolute right-2 top-2 inline-flex size-8 items-center justify-center bg-white text-ink" aria-label="Remove image"><X className="size-4" /></button>
      </figure>;
    })}</div> : null}
  </fieldset>;
}

export function HostExperienceForm({ destinations, hostId, experience }: { destinations: Destination[]; hostId: string; experience?: Experience }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveHostExperience, initial);
  const [imagePaths, setImagePaths] = useState(experience?.image_paths ?? []);
  const getRule = (key: string) => typeof experience?.rules[key] === "string" ? experience.rules[key] as string : "";
  const getBookRule = (key: string) => typeof experience?.booking_policy[key] === "string" ? experience.booking_policy[key] as string : "";
  const getAccess = (key: string) => experience?.accessibility[key];
  useEffect(() => {
    if (state.success && state.data && !experience) router.push(`/host/experiences/${state.data}`);
  }, [experience, router, state.data, state.success]);
  return <form action={action} className="space-y-5">
    <input type="hidden" name="experienceId" value={experience?.id ?? ""} />
    <input type="hidden" name="imagePaths" value={JSON.stringify(imagePaths)} />
    <label className="grid gap-1.5 text-sm font-semibold">Destination<select name="destinationId" required defaultValue={experience?.destination_id ?? ""} className={field}><option value="">Choose destination</option>{destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold">Experience title<input name="title" required minLength={5} maxLength={160} defaultValue={experience?.title} className={field} /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Short description<textarea name="shortDescription" required minLength={20} maxLength={300} rows={2} defaultValue={experience?.short_description} className={textarea} /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Full description<textarea name="description" required minLength={50} maxLength={5000} rows={5} defaultValue={experience?.description} className={textarea} /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Cultural context<textarea name="culturalContext" required minLength={20} maxLength={3000} rows={4} defaultValue={experience?.cultural_context} className={textarea} /></label>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="grid gap-1.5 text-sm font-semibold">Price per guest (JPY)<input name="priceJpy" type="number" required min={0} max={2000000} defaultValue={experience?.price_jpy ?? 0} className={field} /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Duration (minutes)<input name="durationMinutes" type="number" required min={15} max={1440} defaultValue={experience?.duration_minutes ?? 60} className={field} /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Maximum capacity per slot<input name="maxCapacity" type="number" required min={1} max={1000} defaultValue={experience?.max_capacity ?? 8} className={field} /></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-semibold">Languages <span className="text-xs font-normal text-ink/55">Separate with commas</span><input name="languages" maxLength={300} defaultValue={experience?.languages.join(", ")} className={field} /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Interests <span className="text-xs font-normal text-ink/55">Separate with commas</span><input name="interests" required maxLength={300} defaultValue={experience?.interests.join(", ")} placeholder="craft, ceramics" className={field} /></label>
    </div>
    <fieldset className="grid gap-4 border-t border-ink/10 pt-5">
      <legend className="font-semibold">Guest rules and preparation</legend>
      <label className="grid gap-1.5 text-sm font-semibold">Language these rules are written in<select name="rulesLanguage" defaultValue={experience && experience.rules.language === "ja" ? "ja" : "en"} className={field}><option value="en">English</option><option value="ja">Japanese</option></select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Participation rules<textarea name="participationRules" required minLength={10} maxLength={3000} rows={3} defaultValue={getRule("participation_rules")} className={textarea} /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Etiquette rules<textarea name="etiquetteRules" maxLength={3000} rows={3} defaultValue={getRule("etiquette_rules")} className={textarea} /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Eligibility and preparation<textarea name="eligibility" maxLength={2000} rows={2} defaultValue={getRule("eligibility")} className={textarea} /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Photography policy<select name="photographyPolicy" defaultValue={experience?.photography_policy ?? "ask_host"} className={field}><option value="ask_host">Ask the host</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option></select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Cancellation rules<textarea name="cancellationRules" required minLength={10} maxLength={2000} rows={3} defaultValue={getBookRule("cancellation_rules")} className={textarea} /></label>
    </fieldset>
    <fieldset className="grid gap-4 border-t border-ink/10 pt-5">
      <legend className="font-semibold">Access and meeting point</legend>
      <label className="grid gap-1.5 text-sm font-semibold">Accessibility information, including unknowns<textarea name="accessibilityNotes" required minLength={2} maxLength={3000} rows={3} defaultValue={typeof getAccess("notes") === "string" ? getAccess("notes") as string : "Not yet provided"} className={textarea} /></label>
      <div className="flex flex-wrap gap-5 text-sm"><label className="flex min-h-11 items-center gap-2"><input name="stepFree" type="checkbox" defaultChecked={getAccess("step_free") === true} className="size-4 accent-vermilion" />Confirmed step-free access</label><label className="flex min-h-11 items-center gap-2"><input name="wheelchairAccess" type="checkbox" defaultChecked={getAccess("wheelchair_access") === true} className="size-4 accent-vermilion" />Confirmed wheelchair access</label></div>
      <label className="grid gap-1.5 text-sm font-semibold">Meeting point description<input name="meetingPoint" required minLength={3} maxLength={300} defaultValue={experience?.meeting_point} className={field} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Latitude<input name="latitude" inputMode="decimal" defaultValue={experience?.latitude ?? ""} placeholder="35.0000" className={field} /></label><label className="grid gap-1.5 text-sm font-semibold">Longitude<input name="longitude" inputMode="decimal" defaultValue={experience?.longitude ?? ""} placeholder="135.0000" className={field} /></label></div>
      <p className="text-xs text-ink/55">Coordinates are host supplied and will be labeled accordingly.</p>
    </fieldset>
    {experience ? <ExperienceImageEditor hostId={hostId} experienceId={experience.id} initialPaths={imagePaths} onChange={setImagePaths} /> : <p className="border-t border-ink/10 pt-4 text-sm text-ink/60">Save this draft first to attach images through MICHI storage.</p>}
    <div className="flex flex-wrap items-center gap-3 border-t border-ink/10 pt-5"><button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"><Save className="size-4" />{pending ? "Saving…" : "Save experience"}</button><Link href="/host/experiences" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-ink/65 hover:text-vermilion">Cancel</Link></div>
    <ActionMessage state={state} />
  </form>;
}

export function HostExperienceStatus({ experience }: { experience: Experience }) {
  return <section className="border border-ink/15 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-serif text-xl">Listing status</h2><p className="mt-1 text-sm text-ink/60">{experience.status.replace("_", " ")} · {experience.is_verified ? "MICHI verified" : "Awaiting MICHI verification"}</p></div><span className="text-xs text-ink/55">{experience.is_paused ? "Not in recommendations" : "Recommendation visibility active"}</span></div>
    <div className="mt-5"><ExperienceControls experience={experience} /></div>
    {!experience.is_verified ? <p className="mt-3 text-xs leading-5 text-ink/55">A MICHI reviewer must verify host ownership and the listing before publication.</p> : null}
  </section>;
}

export function NewSlotForm({ experiences }: { experiences: Experience[] }) {
  const [state, action, pending] = useActionState(createExperienceSlot, initial);
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Experience<select name="experienceId" required className={field}><option value="">Choose your experience</option>{experiences.filter((item) => item.status !== "archived").map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold">Starts (Japan time)<input name="startsAt" type="datetime-local" required className={field} /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Ends (Japan time)<input name="endsAt" type="datetime-local" required className={field} /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Real guest capacity<input name="capacity" type="number" min={1} max={1000} required className={field} /></label>
    <button type="submit" disabled={pending || experiences.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"><Plus className="size-4" />{pending ? "Saving…" : "Add dated availability"}</button>
    <div className="sm:col-span-2"><ActionMessage state={state} /></div>
  </form>;
}

export function HostSlotRow({ slot }: { slot: Slot }) {
  const [state, action, pending] = useActionState(changeHostSlot, initial);
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const date = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(slot.starts_at));
  return <li className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
    <div><p className="text-sm font-semibold">{date}</p><p className="mt-1 text-xs text-ink/60">{slot.booked_count} reserved · {slot.capacity} capacity · {slot.status}</p></div>
    <div className="flex flex-wrap items-end gap-2">
      <form action={action} className="flex items-end gap-2"><input type="hidden" name="slotId" value={slot.id} /><input type="hidden" name="slotAction" value="capacity" /><label className="grid gap-1 text-[11px] font-semibold">Capacity<input name="capacity" type="number" value={capacity} min={slot.booked_count} max={1000} onChange={(event) => setCapacity(event.target.value)} className={`${field} w-24`} /></label><button type="submit" disabled={pending} className="min-h-11 border border-ink/20 px-3 text-xs font-semibold disabled:opacity-50">Update</button></form>
      {slot.status === "closed" ? <form action={action}><input type="hidden" name="slotId" value={slot.id} /><input type="hidden" name="slotAction" value="reopen" /><button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-semibold text-moss disabled:opacity-50"><RotateCcw className="size-3.5" />Reopen</button></form>
        : slot.status !== "cancelled" ? <form action={action}><input type="hidden" name="slotId" value={slot.id} /><input type="hidden" name="slotAction" value="close" /><button type="submit" disabled={pending} className="min-h-11 px-2 text-xs font-semibold text-vermilion disabled:opacity-50">Close slot</button></form> : null}
    </div>
    <div className="sm:col-span-2"><ActionMessage state={state} /></div>
  </li>;
}

export function HostBookingDecision({ bookingId, decision }: { bookingId: string; decision: "confirm" | "decline" | "cancel" | "complete" }) {
  const actionFn = decision === "confirm" ? confirmHostBooking : decision === "decline" ? declineHostBooking : decision === "cancel" ? cancelHostBooking : completeHostBooking;
  const [state, action, pending] = useActionState(actionFn, initial);
  const label = decision === "confirm" ? "Confirm request" : decision === "decline" ? "Decline request" : decision === "cancel" ? "Cancel booking" : "Mark completed";
  return <form action={action} className="grid justify-items-start gap-1"><input type="hidden" name="bookingId" value={bookingId} /><button type="submit" disabled={pending} className="min-h-10 px-2 text-xs font-semibold underline underline-offset-4 disabled:opacity-50">{pending ? "Saving…" : label}</button><ActionMessage state={state} /></form>;
}

export function HostFeedbackForm({ destinations }: { destinations: Destination[] }) {
  const [state, action, pending] = useActionState(submitHostCommunityFeedback, initial);
  return <form action={action} className="grid gap-4 border-t border-ink/10 pt-5">
    <p className="text-xs leading-5 text-ink/60">Host reports are labeled as host-provided context and are not represented as independent resident sentiment.</p>
    <label className="grid gap-1.5 text-sm font-semibold">Destination<select name="destinationId" required className={field}><option value="">Choose a destination</option>{destinations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Community sentiment<select name="sentiment" className={field}><option value="positive">Positive</option><option value="neutral">Mixed or neutral</option><option value="negative">Concerned</option></select></label><label className="grid gap-1.5 text-sm font-semibold">Pressure observation (optional, 0–100)<input name="pressureScore" type="number" min={0} max={100} className={field} /></label></div>
    <label className="grid gap-1.5 text-sm font-semibold">What are you observing?<textarea name="comment" required minLength={8} maxLength={1000} rows={4} className={textarea} /></label>
    <button type="submit" disabled={pending || !destinations.length} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Submitting…" : "Submit host report"}</button><ActionMessage state={state} />
  </form>;
}

export function HostSettingsForm({ fullName, preferredLanguage }: { fullName: string; preferredLanguage: string }) {
  const [state, action, pending] = useActionState(updateHostSettings, initial);
  return <form action={action} className="grid max-w-xl gap-4">
    <label className="grid gap-1.5 text-sm font-semibold">Display name<input name="fullName" required minLength={2} maxLength={120} defaultValue={fullName} className={field} /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Preferred language<input name="preferredLanguage" required minLength={2} maxLength={16} defaultValue={preferredLanguage} className={field} /></label>
    <button type="submit" disabled={pending} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save settings"}</button><ActionMessage state={state} />
  </form>;
}

export function ExperienceImageStrip({ paths }: { paths: string[] }) {
  if (!paths.length) return <p className="text-xs text-ink/55">No host images added.</p>;
  const supabase = createClient();
  return <div className="mt-3 flex gap-2 overflow-x-auto">{paths.map((path) => <Image key={path} src={supabase.storage.from("experience-images").getPublicUrl(path).data.publicUrl} alt="Experience image" width={140} height={100} unoptimized className="h-20 w-28 shrink-0 object-cover" />)}</div>;
}
