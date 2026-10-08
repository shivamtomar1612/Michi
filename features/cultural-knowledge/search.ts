export function keywordSearchVariants(query: string): string[] {
  const normalized = query.trim();
  const terms = [...new Set(normalized.normalize("NFKC").match(/[\p{L}\p{N}]{2,}/gu) ?? [])].slice(0, 12);
  const variants = [normalized, terms.join(" OR ")].filter(Boolean);
  return [...new Set(variants)];
}
