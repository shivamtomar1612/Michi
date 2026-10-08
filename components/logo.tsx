import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return <Link href="/" aria-label="MICHI home" className={cn("inline-flex items-baseline font-serif text-[1.65rem] font-semibold tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion", light ? "text-white" : "text-ink", className)}>
    MICHI<span aria-hidden="true" className={cn("ml-1 text-[1.15em]", light ? "text-[#d57b61]" : "text-vermilion")}>.</span>
  </Link>;
}
