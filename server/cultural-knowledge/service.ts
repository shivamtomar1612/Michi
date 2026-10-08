import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateConfidence, rankCulturalEvidence } from "@/features/cultural-knowledge/model";
import { getEmbeddingProvider } from "@/features/cultural-knowledge/embedding-provider";
import { keywordSearchVariants } from "@/features/cultural-knowledge/search";
import type { CulturalEvidenceRecord, CulturalQuery } from "@/features/cultural-knowledge/types";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
type Row = Record<string, unknown>;
function mapRow(row: Row): CulturalEvidenceRecord {
  return {
    id: String(row.id), sourceId: String(row.source_id), title: String(row.title), content: String(row.content),
    summary: typeof row.summary === "string" ? row.summary : null,
    category: typeof row.category === "string" ? row.category as CulturalEvidenceRecord["category"] : null,
    subcategory: typeof row.subcategory === "string" ? row.subcategory : null,
    sourceName: String(row.source_name ?? "Unknown source"), sourceUrl: String(row.source_url ?? ""),
    sourceType: String(row.source_type ?? "editorial") as CulturalEvidenceRecord["sourceType"],
    authorityLevel: Number(row.authority_level ?? 1), verificationStatus: String(row.verification_status ?? "unverified") as CulturalEvidenceRecord["verificationStatus"],
    destinationId: typeof row.destination_id === "string" ? row.destination_id : null,
    experienceId: typeof row.experience_id === "string" ? row.experience_id : null,
    language: typeof row.language === "string" ? row.language : null,
    locationScope: typeof row.location_scope === "object" && row.location_scope !== null ? row.location_scope as Record<string, unknown> : {},
    effectiveFrom: typeof row.effective_from === "string" ? row.effective_from : null,
    lastVerifiedAt: typeof row.last_verified_at === "string" ? row.last_verified_at : null,
    nextVerificationAt: typeof row.next_verification_at === "string" ? row.next_verification_at : null,
    isTimeSensitive: row.is_time_sensitive === true, isActive: row.is_active === true,
    metadata: typeof row.metadata === "object" && row.metadata !== null ? row.metadata as Record<string, unknown> : {},
  };
}

export async function retrieveCulturalEvidence(client: Client, query: CulturalQuery) {
  const searchVariants = keywordSearchVariants(query.query);
  const keywordResults = await Promise.all(searchVariants.map((term) => {
    let keywordQuery = client.from("cultural_content").select("*").eq("is_active", true)
      .in("verification_status", ["official_verified", "community_verified"])
      .textSearch("search_vector", term, { type: "websearch", config: "simple" })
      .limit(Math.min((query.limit ?? 5) * 4, 80));
    if (query.category) keywordQuery = keywordQuery.eq("category", query.category);
    if (query.language) keywordQuery = keywordQuery.eq("language", query.language);
    return keywordQuery;
  }));
  if (keywordResults.some((result) => result.error)) throw new Error("Cultural evidence search failed.");
  const rows = new Map<string, Row>(keywordResults.flatMap((result) => result.data ?? []).map((row) => [String(row.id), row as unknown as Row]));
  const semanticScores = new Map<string, number>();

  let semanticRetrievalAvailable = false;
  const provider = getEmbeddingProvider();
  if (provider) {
    try {
      const embedding = await provider.embed(query.query);
      const semantic = await client.rpc("match_cultural_content", {
        query_embedding: JSON.stringify(embedding.values), match_count: Math.min((query.limit ?? 5) * 3, 60),
        ...(query.destinationId ? { match_destination_id: query.destinationId } : {}),
        ...(query.experienceId ? { match_experience_id: query.experienceId } : {}),
        ...(query.category ? { match_category: query.category } : {}),
        ...(query.language ? { match_language: query.language } : {}), requested_model: embedding.model,
      });
      if (!semantic.error && semantic.data?.length) {
        for (const item of semantic.data) semanticScores.set(item.id, item.similarity);
        const semanticRows = await client.from("cultural_content").select("*").in("id", semantic.data.map((item) => item.id)).eq("is_active", true);
        for (const row of semanticRows.data ?? []) rows.set(String(row.id), row as unknown as Row);
        semanticRetrievalAvailable = true;
      }
    } catch {
      // Semantic retrieval is optional; keyword retrieval remains available without provider configuration.
    }
  }
  const ranked = rankCulturalEvidence([...rows.values()].map((row) => ({ ...mapRow(row), semanticSimilarity: semanticScores.get(String(row.id)) })), query);
  return {
    evidence: ranked, confidence: aggregateConfidence(ranked), semanticRetrievalAvailable,
    conflicts: ranked.filter((item) => item.limitations.some((limitation) => limitation.includes("Conflicting records"))).map((item) => ({ id: item.id, sourceName: item.sourceName, sourceUrl: item.sourceUrl })),
  };
}
