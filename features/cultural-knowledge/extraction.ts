export interface SemanticBlock { heading: string; text: string; kind: "paragraph" | "list" | "quote" }
export interface ContentChunk extends SemanticBlock { contentHash: string; sequence: number }

function decodeEntities(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, number: string) => String.fromCodePoint(Number(number)));
}

function textOnly(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

export function extractSemanticBlocks(html: string): SemanticBlock[] {
  const source = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|nav|footer|header|aside|form|noscript|svg|template|iframe|button)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const blocks: SemanticBlock[] = [];
  let heading = "";
  const blockPattern = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of source.matchAll(blockPattern)) {
    const tag = match[1]!.toLowerCase();
    const text = textOnly(match[2]!);
    if (!text || text.length < 12) continue;
    if (tag.startsWith("h")) { heading = text; continue; }
    const kind = tag === "li" ? "list" : tag === "blockquote" ? "quote" : "paragraph";
    blocks.push({ heading, text, kind });
  }
  return blocks;
}

export async function hashContent(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.normalize("NFKC").trim().replace(/\s+/g, " "));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export async function chunkSemanticBlocks(blocks: SemanticBlock[], maxCharacters = 1800): Promise<ContentChunk[]> {
  const groups: SemanticBlock[][] = [];
  let current: SemanticBlock[] = [];
  let length = 0;
  for (const block of blocks) {
    const size = block.text.length + block.heading.length + 2;
    if (current.length && length + size > maxCharacters) { groups.push(current); current = []; length = 0; }
    current.push(block);
    length += size;
  }
  if (current.length) groups.push(current);
  const result: ContentChunk[] = [];
  for (const [sequence, group] of groups.entries()) {
    const heading = group.map((block) => block.heading).filter(Boolean).at(-1) ?? "";
    const text = group.map((block) => block.text).join("\n");
    result.push({ heading, text, kind: group.every((block) => block.kind === "list") ? "list" : "paragraph", sequence, contentHash: await hashContent(heading + "\n" + text) });
  }
  return result;
}
