import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const notice = params.error === "callback" ? "That sign-in link is invalid or has expired. Request a fresh email and try again." : params.error === "setup" ? "Account services are not configured yet." : undefined;
  return <AuthForm mode="login" nextPath={params.next} notice={notice} />;
}
