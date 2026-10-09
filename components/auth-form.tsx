"use client";

import { Link } from "@/i18n/navigation";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { forgotPasswordAction, loginAction, resetPasswordAction, signupAction } from "@/features/auth/actions";
import type { AuthFormState } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type Mode = "login" | "signup" | "forgot" | "reset";

const actions = { login: loginAction, signup: signupAction, forgot: forgotPasswordAction, reset: resetPasswordAction };

export function AuthForm({ mode, nextPath, notice }: { mode: Mode; nextPath?: string; notice?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState<AuthFormState, FormData>(actions[mode], {});
  const locale = useLocale();
  const t = useTranslations("Auth");
  const copy = {
    login: [t("welcome"), t("signInTitle"), t("signInCopy"), t("signIn")],
    signup: [t("begin"), t("createTitle"), t("createCopy"), t("create")],
    forgot: [t("accountAccess"), t("resetTitle"), t("resetCopy"), t("sendReset")],
    reset: [t("accountAccess"), t("newPasswordTitle"), t("newPasswordCopy"), t("savePassword")],
  }[mode];
  return <div className="mx-auto w-full max-w-md">
    <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/65 hover:text-vermilion"><ArrowLeft className="size-3.5" /> {t("back")}</Link>
    <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-vermilion">{copy[0]}</p>
    <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em]">{copy[1]}</h1>
    <p className="mt-3 text-sm leading-6 text-ink/65">{copy[2]}</p>
    {notice ? <p role="status" className="mt-5 border-l-2 border-vermilion bg-vermilion/5 px-4 py-3 text-xs leading-5 text-ink">{notice}</p> : null}
    <form className="mt-8 space-y-5" action={action}>
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <input type="hidden" name="locale" value={locale} />
      {mode === "signup" ? <FormField id="name" label={t("name")}><Input autoComplete="name" id="name" name="name" placeholder={t("namePlaceholder")} minLength={2} maxLength={120} required /></FormField> : null}
      {mode !== "reset" ? <FormField id="email" label={t("email")}><Input autoComplete="email" id="email" name="email" type="email" placeholder="you@example.com" required /></FormField> : null}
      {mode !== "forgot" ? <FormField id="password" label={mode === "reset" ? t("newPassword") : t("password")}> <div className="relative"><Input autoComplete={mode === "login" ? "current-password" : "new-password"} id="password" name="password" type={showPassword ? "text" : "password"} placeholder={t("passwordPlaceholder")} minLength={8} required className="pr-12" /><button className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion" type="button" aria-label={showPassword ? t("hidePassword") : t("showPassword")} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></FormField> : null}
      {state.message ? <p aria-live="polite" className={`border-l-2 px-4 py-3 text-xs leading-5 ${state.success ? "border-moss bg-moss/10 text-ink" : "border-vermilion bg-vermilion/5 text-ink"}`}>{state.message}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>{pending ? t("wait") : copy[3]}</Button>
    </form>
    <div className="mt-6 flex flex-col gap-3 text-sm text-ink/70">{mode === "login" ? <><Link className="hover:text-vermilion" href={`/auth/forgot-password${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>{t("forgot")}</Link><p>{t("newHere")} <Link className="font-semibold text-vermilion" href={`/auth/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>{t("createAccount")}</Link></p></> : mode === "signup" ? <p>{t("already")} <Link className="font-semibold text-vermilion" href={`/auth/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>{t("returnSignIn")}</Link></p> : <p>{t("remembered")} <Link className="font-semibold text-vermilion" href={`/auth/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>{t("returnSignIn")}</Link></p>}</div>
  </div>;
}
