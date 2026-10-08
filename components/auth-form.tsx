"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { forgotPasswordAction, loginAction, resetPasswordAction, signupAction } from "@/features/auth/actions";
import type { AuthFormState } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type Mode = "login" | "signup" | "forgot" | "reset";

const modeCopy: Record<Mode, { eyebrow: string; title: string; description: string; button: string }> = {
  login: { eyebrow: "Welcome back", title: "Sign in to MICHI", description: "Pick up where your journey left off.", button: "Sign in" },
  signup: { eyebrow: "Begin your journey", title: "Create an account", description: "Join a more considered way to explore Japan.", button: "Create account" },
  forgot: { eyebrow: "Account access", title: "Reset your password", description: "Enter the email address associated with your account.", button: "Send reset link" },
  reset: { eyebrow: "Account access", title: "Choose a new password", description: "Use at least eight characters for your new password.", button: "Save new password" },
};

const actions = { login: loginAction, signup: signupAction, forgot: forgotPasswordAction, reset: resetPasswordAction };

export function AuthForm({ mode, nextPath, notice }: { mode: Mode; nextPath?: string; notice?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState<AuthFormState, FormData>(actions[mode], {});
  const copy = modeCopy[mode];
  return <div className="mx-auto w-full max-w-md">
    <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/65 hover:text-vermilion"><ArrowLeft className="size-3.5" /> Back to MICHI</Link>
    <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-vermilion">{copy.eyebrow}</p>
    <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em]">{copy.title}</h1>
    <p className="mt-3 text-sm leading-6 text-ink/65">{copy.description}</p>
    {notice ? <p role="status" className="mt-5 border-l-2 border-vermilion bg-vermilion/5 px-4 py-3 text-xs leading-5 text-ink">{notice}</p> : null}
    <form className="mt-8 space-y-5" action={action}>
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      {mode === "signup" ? <FormField id="name" label="Your name"><Input autoComplete="name" id="name" name="name" placeholder="Name" minLength={2} maxLength={120} required /></FormField> : null}
      {mode !== "reset" ? <FormField id="email" label="Email address"><Input autoComplete="email" id="email" name="email" type="email" placeholder="you@example.com" required /></FormField> : null}
      {mode !== "forgot" ? <FormField id="password" label={mode === "reset" ? "New password" : "Password"}> <div className="relative"><Input autoComplete={mode === "login" ? "current-password" : "new-password"} id="password" name="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" minLength={8} required className="pr-12" /><button className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></FormField> : null}
      {state.message ? <p aria-live="polite" className={`border-l-2 px-4 py-3 text-xs leading-5 ${state.success ? "border-moss bg-moss/10 text-ink" : "border-vermilion bg-vermilion/5 text-ink"}`}>{state.message}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>{pending ? "Please wait…" : copy.button}</Button>
    </form>
    <div className="mt-6 flex flex-col gap-3 text-sm text-ink/70">{mode === "login" ? <><Link className="hover:text-vermilion" href={`/auth/forgot-password${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>Forgot password?</Link><p>New to MICHI? <Link className="font-semibold text-vermilion" href={`/auth/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>Create an account</Link></p></> : mode === "signup" ? <p>Already have an account? <Link className="font-semibold text-vermilion" href={`/auth/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>Sign in</Link></p> : <p>Remembered it? <Link className="font-semibold text-vermilion" href={`/auth/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>Sign in</Link></p>}</div>
  </div>;
}
