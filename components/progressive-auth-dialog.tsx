"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ProgressiveAuthDialog({ open, onOpenChange, nextPath = "/traveler", title = "Save your journey with MICHI.", description = "Create an account to keep your itineraries, bookings and cultural discoveries in one place." }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextPath?: string;
  title?: string;
  description?: string;
}) {
  const encodedNext = encodeURIComponent(nextPath);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby="progressive-auth-description">
      <p className="eyebrow">Continue when it helps</p>
      <DialogTitle className="mt-3 font-serif text-3xl">{title}</DialogTitle>
      <DialogDescription id="progressive-auth-description" className="mt-3 text-sm leading-6 text-ink/65">{description}</DialogDescription>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <ButtonLink href={`/auth/login?next=${encodedNext}`} onClick={() => onOpenChange(false)}>Sign in</ButtonLink>
        <ButtonLink href={`/auth/signup?next=${encodedNext}`} variant="secondary" onClick={() => onOpenChange(false)}>Create account</ButtonLink>
      </div>
      <DialogClose className="mt-5 min-h-11 text-sm font-medium text-ink/65 underline underline-offset-4">Continue exploring</DialogClose>
      <Link href={`/auth/forgot-password?next=${encodedNext}`} onClick={() => onOpenChange(false)} className="ml-4 inline-flex min-h-11 items-center text-sm text-ink/60 hover:text-vermilion">Forgot password?</Link>
    </DialogContent>
  </Dialog>;
}
