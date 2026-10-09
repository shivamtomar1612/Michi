import type { Metadata } from "next";
import { ArrowRight, HeartHandshake, Scale, ShieldCheck } from "lucide-react";
import { PageIntro } from "@/components/page-intro";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "How MICHI works" };

const principles = [
  { icon: Scale, title: "Recommendations are accountable", copy: "MICHI uses deterministic factors for personal match, cultural depth, local benefit, accessibility, availability, and destination health. AI can explain a result, but it does not decide the ranking." },
  { icon: ShieldCheck, title: "Knowledge carries its source", copy: "Cultural guidance should come from reviewed official or community evidence. Explanations should cite that evidence; where it is missing or conflicting, MICHI should abstain." },
  { icon: HeartHandshake, title: "Communities set the terms", copy: "Hosts control capacity, availability, visibility, participation rules, and photography guidance. Pausing discovery should never erase a confirmed booking." },
];

export default function AboutPage() {
  return <><PageIntro eyebrow="How MICHI works" title="Travel can create a better exchange." description="MICHI is being built around a simple idea: a trip should work for the traveler and respect the people and places that make it meaningful." />
    <div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <div className="grid gap-0 md:grid-cols-3">{principles.map(({ icon: Icon, title, copy }) => <article key={title} className="border-t border-ink/20 px-0 py-7 sm:px-6 sm:first:pl-0 sm:last:pr-0"><Icon className="size-5 text-vermilion" aria-hidden="true" /><h2 className="mt-6 font-serif text-2xl">{title}</h2><p className="mt-3 text-sm leading-7 text-ink/65">{copy}</p></article>)}</div>
      <section className="mt-14 border border-ink/15 bg-white p-6 sm:p-10" aria-labelledby="truth-heading"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-vermilion">Trust and transparency</p><h2 id="truth-heading" className="mt-3 font-serif text-3xl">A clear label for every kind of information.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-ink/65">Official source records, primary operator details, community contributions, unverified information, and stale information are different things. MICHI displays source and review status with public catalog records; unknown facts remain unfilled.</p><p className="mt-4 text-xs font-semibold leading-5 text-ink/55">MICHI booking is available only for verified hosts with real open slots; no MICHI host slots are currently published. Destination Health remains unavailable when current component evidence is incomplete. The Cultural Companion uses retrieved evidence and can abstain when it is insufficient or the service is unavailable.</p></section>
      <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-ink/15 pt-9 sm:flex-row sm:items-center"><p className="max-w-xl font-serif text-2xl">The best journey leaves room for another point of view.</p><ButtonLink href="/discover" variant="secondary">Explore Japan <ArrowRight className="size-4" /></ButtonLink></div>
    </div>
  </>;
}
