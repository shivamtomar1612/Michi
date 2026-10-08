import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z.string().min(8, "Use at least 8 characters.").max(128);

export const loginSchema = z.object({ email, password });
export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email,
  password,
});
export const emailSchema = z.object({ email });
export const resetPasswordSchema = z.object({ password });

export type AuthFormState = { message?: string; success?: boolean };

export function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
