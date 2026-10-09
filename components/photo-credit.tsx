import type { DestinationPhoto } from "@/features/destinations/photography";

export function PhotoCredit({ photo, className = "" }: { photo: DestinationPhoto; className?: string }) {
  return <p className={`text-xs leading-5 ${className}`}>
    Photo: <a className="underline underline-offset-2" href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.creator}</a>
    {" · "}<a className="underline underline-offset-2" href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>
    {" · cropped for layout"}
  </p>;
}
