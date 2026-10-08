import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpenCheck, Compass, HeartHandshake, MapPin } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { DestinationCard } from "@/components/destination-card";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { ExperienceCard } from "@/components/experience-card";
import { MotionReveal } from "@/components/motion-reveal";
import { SectionHeading } from "@/components/section-heading";
import { listDestinations, listExternalExperiences } from "@/server/data/catalogue";
import { EmptyState } from "@/components/ui/states";

const journey = ["Discover", "Understand", "Choose responsibly", "Connect", "Reflect"];

export default async function HomePage() {
  const [destinationResult, experienceResult] = await Promise.all([listDestinations(), listExternalExperiences()]);
  const destinations = destinationResult.ok ? destinationResult.data : [];
  const experiences = experienceResult.ok ? experienceResult.data : [];
  const catalogueFailure = !destinationResult.ok ? destinationResult : !experienceResult.ok ? experienceResult : null;
  return <>
    <section className="relative isolate min-h-[640px] overflow-hidden bg-ink sm:min-h-[700px] lg:min-h-[min(790px,calc(100svh-4.5rem))]" aria-labelledby="hero-title">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(ellipse_at_82%_18%,rgba(150,74,54,.36),transparent_42%),linear-gradient(135deg,transparent_49.8%,rgba(255,255,255,.08)_50%,transparent_50.2%)] [background-size:100%_100%,96px_96px]" />
      <div className="container-editorial flex min-h-[640px] items-center py-24 sm:min-h-[700px] lg:min-h-[min(790px,calc(100svh-4.5rem))]">
        <div className="max-w-[760px] text-white">
          <p className="hero-enter mb-7 inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85"><span className="h-px w-8 bg-[#d57b61]" />A more considered way to explore Japan</p>
          <h1 id="hero-title" className="hero-enter display-type max-w-[760px] text-white">Travel deeper.<br /><span className="text-[#ead8c5]">Leave lighter.</span></h1>
          <p className="hero-enter mt-7 max-w-[570px] text-base leading-7 text-white/90 sm:text-lg sm:leading-8">Discover Japan through meaningful local experiences while respecting the communities and places that make them possible.</p>
          <div className="hero-enter mt-9 flex flex-col gap-3 sm:flex-row"><ButtonLink href="/discover" variant="light">Explore Japan <ArrowRight className="size-4" /></ButtonLink><ButtonLink href="#how-it-works" variant="secondary" className="border-white/55 text-white hover:bg-white/10">How MICHI works <ArrowDown className="size-4" /></ButtonLink></div>
          <Link href="/traveler/plan" className="hero-enter mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-white/85 underline decoration-white/45 underline-offset-4 hover:text-white">Preview an itinerary <ArrowRight className="size-4" /></Link>
          <div className="hero-enter mt-10 inline-flex items-center gap-2 text-xs text-white/80"><MapPin className="size-3.5" aria-hidden="true" />Japan · Culture · Community · Discovery</div>
        </div>
      </div>
    </section>

    {catalogueFailure ? <div className="container-editorial py-6"><CatalogueUnavailable failure={catalogueFailure} /></div> : null}

    <section id="how-it-works" className="scroll-mt-20 border-b border-ink/10 bg-paper section-space">
      <div className="container-editorial grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
        <MotionReveal><SectionHeading eyebrow="The MICHI point of view" title={<>Not just where to go.<br />When, why and how matter too.</>} description="A meaningful journey considers what interests you and what a place is ready to share. MICHI brings those perspectives together before you choose." /></MotionReveal>
        <div className="grid gap-0 sm:grid-cols-3">
          {[{ n: "01", icon: Compass, title: "Start with you", copy: "Begin with your interests, pace, and access needs." }, { n: "02", icon: MapPin, title: "Understand place", copy: "See context and capacity alongside the experience." }, { n: "03", icon: HeartHandshake, title: "Meet with care", copy: "Connect with local hosts on terms they set." }].map(({ n, icon: Icon, title, copy }, index) => <MotionReveal key={n} delay={index * 70} className="border-t border-ink/20 px-0 py-6 sm:px-5 sm:first:pl-0 sm:last:pr-0">
            <div className="flex items-center justify-between"><span className="font-serif text-sm text-vermilion">{n}</span><Icon className="size-[18px] text-moss" aria-hidden="true" /></div><h3 className="mt-7 font-serif text-xl">{title}</h3><p className="mt-3 text-sm leading-6 text-ink/70">{copy}</p>
          </MotionReveal>)}
        </div>
      </div>
    </section>

    <section className="section-space">
      <div className="container-editorial grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <MotionReveal><SectionHeading eyebrow="Responsible discovery" title="Your first choice is not your only good choice." description="If visitor pressure is higher in your preferred destination, MICHI can help you compare relevant alternatives while keeping the decision yours." />
          <p className="mt-5 max-w-lg text-sm leading-6 text-ink/70">Recommendations are designed to balance personal match, cultural depth, local benefit, accessibility, availability, and destination health. Ranking is deterministic; AI does not choose the order.</p><ButtonLink href="/discover" variant="secondary" className="mt-7">Compare destinations <ArrowRight className="size-4" /></ButtonLink>
        </MotionReveal>
        <MotionReveal className="border-l-2 border-vermilion bg-white p-6 sm:p-8"><p className="eyebrow">Evidence before comparison</p><h3 className="mt-4 max-w-lg font-serif text-2xl">Pressure and capacity are shown only when a dated, approved signal is available.</h3><p className="mt-3 max-w-lg text-sm leading-6 text-ink/65">This catalogue has no connected live crowd feed or validated destination health scores. We keep those values unknown and link to official city guidance instead of implying live conditions.</p><Link href="/destinations" className="editorial-link mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion">Browse sourced destinations <ArrowRight className="size-4" /></Link></MotionReveal>
      </div>
    </section>

    <section className="bg-[#e9ece5] section-space">
      <div className="container-editorial grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <MotionReveal><SectionHeading eyebrow="Destination Health" title="A place has a rhythm. Travel with it." description="Pressure, remaining capacity, community readiness, transport access, and seasonal suitability belong in the same conversation." /><ButtonLink href="/destinations" variant="secondary" className="mt-7">Explore destination context <ArrowUpRight className="size-4" /></ButtonLink></MotionReveal>
        <MotionReveal className="border border-ink/12 bg-white p-6 sm:p-8"><p className="eyebrow">Current source coverage</p><p className="mt-4 font-serif text-3xl">Not yet available</p><p className="mt-3 max-w-lg text-sm leading-6 text-ink/65">Crowd pressure, remaining capacity, community readiness, transport access, and seasonal suitability are not connected to verified, time-stamped feeds yet.</p><Link href="/destinations" className="editorial-link mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion">See destination sources <ArrowRight className="size-4" /></Link></MotionReveal>
      </div>
    </section>

    <section className="section-space">
      <div className="container-editorial">
        <MotionReveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><SectionHeading eyebrow="Local cultural experiences" title="Spend time with people who know this place." description="Experiences should make context, participation, and host-set capacity clear before a visitor commits." /><Link href="/experiences" className="editorial-link inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-vermilion"><span>All experiences</span><ArrowRight className="size-4" /></Link></MotionReveal>
        {experienceResult.ok ? experiences.length ? <div className="editorial-scroll mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">{experiences.slice(0, 3).map((experience) => <div key={experience.slug} className="w-[min(82vw,350px)] shrink-0 snap-start md:w-auto"><ExperienceCard experience={experience} destinationName={destinations.find((destination) => destination.id === experience.destination_id)?.name ?? "Destination not verified"} /></div>)}</div> : <div className="mt-8"><EmptyState title="No verified listings available" description="Official operator listings will appear after the reviewed catalogue is loaded." actionHref="/experiences" actionLabel="Browse experiences" /></div> : null}
      </div>
    </section>

    <section className="bg-[#f0ede5] section-space">
      <div className="container-editorial grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <MotionReveal><SectionHeading eyebrow="Cultural intelligence" title="Good guidance carries its source." description="MICHI is designed to explain reviewed evidence, not invent cultural answers. When reliable evidence is missing or conflicts, the right response is to say so." /><div className="mt-6 flex items-start gap-3 border-l-2 border-vermilion pl-4"><BookOpenCheck className="mt-1 size-5 shrink-0 text-vermilion" aria-hidden="true" /><p className="text-sm leading-6 text-ink/70">Gemini may help explain retrieved sources. It is never the cultural database.</p></div></MotionReveal>
        <MotionReveal className="border border-ink/12 bg-[#fffefa] p-6 sm:p-8"><p className="eyebrow">Evidence-led guidance</p><h3 className="mt-4 max-w-lg font-serif text-2xl">Every cultural answer needs a source, scope, and review date.</h3><p className="mt-3 max-w-lg text-sm leading-6 text-ink/65">MICHI’s cultural companion is not connected yet. Until reviewed evidence is available for a question, it should say what is unknown instead of supplying an unsupported answer.</p><Link href="/about" className="editorial-link mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion">Read our information standards <ArrowRight className="size-4" /></Link></MotionReveal>
      </div>
    </section>

    <section className="bg-ink py-20 text-white sm:py-28">
      <div className="container-editorial">
        <MotionReveal><div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20"><div><SectionHeading light eyebrow="Community-first tourism" title="Communities decide how they participate." description="A welcome is not inventory. Hosts set the terms, and can change discovery visibility without removing existing confirmed bookings." /><p className="mt-5 text-xs text-white/65">Host listing and booking controls are not connected yet.</p></div>
          <div className="grid gap-0 sm:grid-cols-3">{[{ title: "Consent", copy: "Hosts choose what they share and the terms of participation." }, { title: "Capacity", copy: "Availability and visitor limits stay under host control." }, { title: "Visibility", copy: "Hosts can pause discovery without removing confirmed bookings." }].map((item) => <article key={item.title} className="border-t border-white/25 py-5 sm:mx-4 sm:first:ml-0 sm:last:mr-0"><p className="font-serif text-2xl">{item.title}</p><p className="mt-3 text-sm leading-6 text-white/70">{item.copy}</p></article>)}</div></div></MotionReveal>
      </div>
    </section>

    <section className="bg-[#f0ede5] section-space">
      <div className="container-editorial grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
        <MotionReveal><SectionHeading eyebrow="How communities benefit" title="Local voices shape the exchange." description="Hosts choose what they share and how visitors take part. MICHI is designed to make that control visible before a traveler commits." /><p className="mt-5 text-xs text-ink/55">These are product principles, not measured outcomes.</p></MotionReveal>
        <div className="grid gap-x-8 sm:grid-cols-3">{[{ title: "Consent", copy: "Hosts decide what is shared and the terms of participation." }, { title: "Capacity", copy: "Availability and visitor limits remain in host control." }, { title: "Local value", copy: "Experiences make community-hosted exchange easier to find." }].map((item, index) => <MotionReveal key={item.title} delay={index * 60} className="border-t border-ink/20 py-5"><p className="font-serif text-xl">{item.title}</p><p className="mt-3 text-sm leading-6 text-ink/65">{item.copy}</p></MotionReveal>)}</div>
      </div>
    </section>

    <section className="section-space">
      <div className="container-editorial">
        <MotionReveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><SectionHeading eyebrow="Featured regions" title="More than one way into Japan." description="Explore officially documented places with their source and verification details." /><Link href="/destinations" className="editorial-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion"><span>All destinations</span><ArrowRight className="size-4" /></Link></MotionReveal>
        {destinationResult.ok ? destinations.length ? <div className="mt-9 grid gap-5 md:grid-cols-3">{destinations.slice(0, 3).map((destination, index) => <MotionReveal key={destination.slug} delay={index * 60}><DestinationCard destination={destination} /></MotionReveal>)}</div> : <div className="mt-8"><EmptyState title="No verified destinations available" description="Official destination records will appear here after the reviewed catalogue is loaded." actionHref="/destinations" actionLabel="Open destinations" /></div> : null}
      </div>
    </section>

    <section className="border-y border-ink/10 bg-paper-deep section-space">
      <div className="container-editorial grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <MotionReveal><SectionHeading eyebrow="How MICHI works" title="A journey with room to listen." description="A simple progression gives context before commitment, and reflection after the experience." /></MotionReveal>
        <ol className="grid gap-0 sm:grid-cols-5">{journey.map((step, index) => <li key={step} className="border-t border-ink/25 py-4 sm:pr-3"><span className="font-serif text-sm text-vermilion">0{index + 1}</span><p className="mt-3 font-serif text-lg leading-5">{step}</p>{index < journey.length - 1 ? <ArrowRight className="mt-5 hidden size-4 text-ink/40 sm:block" aria-hidden="true" /> : null}</li>)}</ol>
      </div>
    </section>

    <section className="section-space">
      <div className="container-editorial grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <MotionReveal><SectionHeading eyebrow="A different measure of impact" title="Measure what matters to the places that welcome us." description="Future destination insights should help communities understand how tourism is experienced and where value reaches local hosts." /><p className="mt-5 text-xs text-ink/55">Impact measures are planned; no metrics are connected or shown as achieved.</p></MotionReveal>
        <div className="grid gap-x-8 sm:grid-cols-2">{[{ title: "Visitor dispersion", copy: "Understand where visitors spend time across a destination." }, { title: "Community benefit", copy: "Track whether local hosts see a fair share of visitor activity." }, { title: "Cultural understanding", copy: "Learn whether context and consent are clear before participation." }, { title: "Responsible capacity", copy: "Compare visitor interest with capacity communities choose to share." }].map((item, index) => <MotionReveal key={item.title} delay={index * 55} className="border-t border-ink/20 py-5"><p className="font-serif text-xl">{item.title}</p><p className="mt-2 max-w-xs text-sm leading-6 text-ink/65">{item.copy}</p></MotionReveal>)}</div>
      </div>
    </section>

    <section className="border-y border-ink/10 bg-paper-deep py-12 sm:py-16">
      <div className="container-editorial grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <MotionReveal><SectionHeading eyebrow="Trust, by design" title="Know what is known — and who says so." description="Information should carry its source, verification status, and freshness with it." /></MotionReveal>
        <MotionReveal><ul className="grid gap-x-8 sm:grid-cols-2">{["Verified official", "Primary operator", "Host provided", "Community provided", "Unverified", "Stale or unknown"].map((item) => <li key={item} className="flex min-h-12 items-center gap-3 border-b border-ink/10 text-sm"><span className="size-1.5 shrink-0 bg-moss" />{item}</li>)}</ul><p className="mt-4 text-xs leading-5 text-ink/55">The public catalogue displays sourced official and operator records. MICHI does not currently publish host-provided or community-provided records.</p></MotionReveal>
      </div>
    </section>

    <section className="border-t border-ink/10 bg-[#e7e9e2] section-space">
      <div className="container-editorial grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <MotionReveal><p className="eyebrow">A thoughtful next step</p><h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] tracking-[-0.035em] sm:text-5xl">See Japan differently.</h2><p className="mt-4 text-base text-ink/70">Explore responsibly, with space for another point of view.</p></MotionReveal>
        <MotionReveal><ButtonLink href="/discover">Start exploring <ArrowRight className="size-4" /></ButtonLink></MotionReveal>
      </div>
    </section>
  </>;
}
