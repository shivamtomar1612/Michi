"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeLocalPath } from "@/lib/auth/redirects";
import { emailSchema, loginSchema, readFormString, resetPasswordSchema, signupSchema, type AuthFormState } from "./schemas";

function configError(): AuthFormState | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    return { message: "Account services are not configured yet. Please try again later." };
  }
  return null;
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configured = configError();
  if (configured) return configured;
  const parsed = loginSchema.safeParse({ email: readFormString(formData, "email"), password: readFormString(formData, "password") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: error.message };
  redirect(safeLocalPath(readFormString(formData, "next"), "/traveler"));
}

export async function signupAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configured = configError();
  if (configured) return configured;
  const parsed = signupSchema.safeParse({ name: readFormString(formData, "name"), email: readFormString(formData, "email"), password: readFormString(formData, "password") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const next = safeLocalPath(readFormString(formData, "next"), "/traveler");
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { message: error.message };
  return { success: true, message: "Check your email for a verification link to finish creating your account." };
}

export async function forgotPasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configured = configError();
  if (configured) return configured;
  const parsed = emailSchema.safeParse({ email: readFormString(formData, "email") });
  if (!parsed.success) return { message: "Enter a valid email address." };
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const next = safeLocalPath(readFormString(formData, "next"), "/traveler");
  const resetPath = `/auth/reset-password?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(resetPath)}` });
  if (error) return { message: error.message };
  return { success: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configured = configError();
  if (configured) return configured;
  const parsed = resetPasswordSchema.safeParse({ password: readFormString(formData, "password") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the new password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: error.message };
  redirect(safeLocalPath(readFormString(formData, "next"), "/traveler"));
}

export async function logoutAction() {
  if (configError()) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
