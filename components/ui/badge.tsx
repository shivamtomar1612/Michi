import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center gap-1.5 border border-ink/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/75", className)} {...props} />;
}
