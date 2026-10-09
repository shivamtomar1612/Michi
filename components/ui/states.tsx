import { AlertCircle, SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return <section className="border border-dashed border-ink/20 px-6 py-12 text-center" aria-label={title}>
    <SearchX className="mx-auto size-6 text-ink/50" aria-hidden="true" />
    <h2 className="mt-4 font-serif text-2xl">{title}</h2>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink/65">{description}</p>
    {actionHref && actionLabel ? <Link href={actionHref} className="mt-5 inline-flex min-h-11 items-center justify-center border border-ink/20 px-4 text-sm font-semibold hover:bg-ink/5">{actionLabel}</Link> : null}
  </section>;
}

export function ErrorState({ title = "This section could not load", description, onRetry, returnHref = "/discover", returnLabel = "Return to Discover" }: { title?: string; description: string; onRetry?: () => void; returnHref?: string; returnLabel?: string }) {
  return <section className="flex gap-3 border border-[#a34f3b]/25 bg-[#fbf4f0] p-5" role="alert">
    <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#8a3826]" aria-hidden="true" />
    <div><h2 className="font-semibold text-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-ink/70">{description}</p><div className="mt-4 flex flex-wrap gap-3">{onRetry ? <Button type="button" size="small" variant="secondary" onClick={onRetry}>Retry</Button> : null}<Link href={returnHref} className="inline-flex min-h-10 items-center px-3 text-xs font-semibold text-vermilion hover:underline">{returnLabel}</Link></div></div>
  </section>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-ink/10 ${className}`} aria-hidden="true" />;
}

export function LoadingRows() {
  return <div className="space-y-3" aria-busy="true" aria-label="Loading content">
    <Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 w-full" />
  </div>;
}

export function ImageSkeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-[linear-gradient(105deg,#e8e5dc_25%,#f2f0e9_45%,#e8e5dc_65%)] bg-[length:200%_100%] ${className}`} />;
}

export function CardSkeleton() {
  return <div className="border border-ink/10 bg-white" aria-busy="true" aria-label="Loading experience">
    <ImageSkeleton className="aspect-[4/3]" /><div className="space-y-3 p-5"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
  </div>;
}
