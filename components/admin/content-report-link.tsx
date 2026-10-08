import Link from "next/link";

export function ContentReportLink({ subjectType, subjectId }: { subjectType: "destination" | "place" | "experience" | "external_experience" | "cultural_content"; subjectId: string }) {
  const query = new URLSearchParams({ subjectType, subjectId });
  return <Link href={`/report/new?${query.toString()}`} className="inline-flex min-h-10 items-center text-xs text-ink/60 underline decoration-ink/25 underline-offset-4 hover:text-vermilion">Report an issue with this listing</Link>;
}
