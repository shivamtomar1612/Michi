import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const inputStyle = "min-h-12 w-full border border-ink/20 bg-white px-4 text-sm text-ink placeholder:text-ink/45 focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15 disabled:cursor-not-allowed disabled:bg-ink/5";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputStyle, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputStyle, "min-h-28 py-3", className)} {...props} />;
}
