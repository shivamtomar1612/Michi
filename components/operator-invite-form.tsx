"use client";

import { useActionState } from "react";
import { inviteOperator } from "@/features/hosts/actions";

export function OperatorInviteForm() {
  const [state, action, pending] = useActionState(inviteOperator, { message: "", success: false });
  return <form action={action} className="mt-5 grid max-w-xl gap-4 border border-ink/15 bg-white p-5">
    <p className="text-sm leading-6 text-ink/65">Invite only an operator whose contact address you have independently confirmed. An invitation grants traveler access for the application; it does not verify a host.</p>
    <label className="grid gap-2 text-sm font-semibold">Operator email<input name="email" type="email" required maxLength={254} className="min-h-11 border border-ink/20 px-3 font-normal" /></label>
    <label className="grid gap-2 text-sm font-semibold">Existing external listing ID <span className="font-normal text-ink/60">Optional, for internal follow-up</span><input name="externalExperienceId" type="text" className="min-h-11 border border-ink/20 px-3 font-normal" /></label>
    <button type="submit" disabled={pending} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending…" : "Send operator invitation"}</button>
    {state.message ? <p role="status" className={state.success ? "text-sm text-moss" : "text-sm text-vermilion"}>{state.message}</p> : null}
  </form>;
}
