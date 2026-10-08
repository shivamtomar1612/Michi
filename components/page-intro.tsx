export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="border-b border-ink/10 bg-paper py-12 sm:py-16 lg:py-20">
    <div className="container-editorial">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-vermilion">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[1.05] tracking-[-0.03em] sm:text-6xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-ink/65">{description}</p>
    </div>
  </header>;
}
