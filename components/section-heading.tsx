import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, description, light = false }: { eyebrow?: string; title: ReactNode; description?: string; light?: boolean }) {
  return <div className="max-w-2xl">
    {eyebrow ? <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${light ? "text-white/60" : "text-vermilion"}`}>{eyebrow}</p> : null}
    <h2 className={`${eyebrow ? "mt-3" : ""} font-serif text-3xl leading-[1.12] tracking-[-0.025em] sm:text-4xl lg:text-[2.8rem] ${light ? "text-white" : "text-ink"}`}>{title}</h2>
    {description ? <p className={`mt-4 max-w-xl text-base leading-7 ${light ? "text-white/75" : "text-ink/70"}`}>{description}</p> : null}
  </div>;
}
