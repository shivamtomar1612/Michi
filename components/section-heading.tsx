import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, description, light = false }: { eyebrow: string; title: ReactNode; description?: string; light?: boolean }) {
  return <div className="max-w-2xl">
    <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${light ? "text-white/60" : "text-vermilion"}`}>{eyebrow}</p>
    <h2 className={`mt-3 font-serif text-3xl leading-[1.12] tracking-[-0.025em] sm:text-4xl lg:text-[2.8rem] ${light ? "text-white" : "text-ink"}`}>{title}</h2>
    {description ? <p className={`mt-4 max-w-xl text-sm leading-7 sm:text-base ${light ? "text-white/70" : "text-ink/65"}`}>{description}</p> : null}
  </div>;
}
