import type { CulturalCategory } from "./types";

export interface NormalizedContent { title: string; summary: string; content: string; category: CulturalCategory; language: string }

export function normalizeCulturalContent(input: NormalizedContent): NormalizedContent {
  const clean = (value: string) => value.normalize("NFKC").replace(/[\t\n\r ]+/g, " ").split("").filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code >= 0x20 && code !== 0x7f;
  }).join("").trim();
  return { ...input, title: clean(input.title), summary: clean(input.summary), content: clean(input.content), language: clean(input.language).toLowerCase() };
}
