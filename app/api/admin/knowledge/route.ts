import { NextResponse, type NextRequest } from "next/server";
import { contentSubmitSchema, reviewContentSchema, sourceCreateSchema, sourceIdSchema } from "@/server/cultural-knowledge/schemas";
import { getKnowledgeAdmin } from "@/server/cultural-knowledge/authorization";
import { fetchApprovedSource, SourceFetchError, validateApprovedUrl } from "@/features/cultural-knowledge/security";
import { chunkSemanticBlocks, extractSemanticBlocks, hashContent } from "@/features/cultural-knowledge/extraction";
import { normalizeCulturalContent } from "@/features/cultural-knowledge/normalize";
import { getEmbeddingProvider } from "@/features/cultural-knowledge/embedding-provider";
import type { Json, Database } from "@/types/database";
import { canPublishCulturalVerification } from "@/features/cultural-knowledge/authorization";
import { isCulturalRecordStale, detectCulturalConflicts } from "@/features/cultural-knowledge/model";
import type { CulturalEvidenceRecord } from "@/features/cultural-knowledge/types";

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  const auth = await getKnowledgeAdmin();
  if (!auth.authorized) return fail("Administrator access is required.", auth.user ? 403 : 401);
  const view = request.nextUrl.searchParams.get("view") ?? "overview";
  if (view === "sources") {
    const { data, error } = await auth.supabase.from("cultural_sources").select("id,name,base_url,source_type,authority_level,default_verification_status,language,is_active,allow_automatic_ingestion,approved_domains,approved_urls,terms_reviewed_at,notes").order("authority_level", { ascending: false }).limit(200);
    if (error) return fail("Source registry could not be loaded.", 503);
    return NextResponse.json({ sources: data ?? [] });
  }
  const query = auth.supabase.from("cultural_content").select("id,title,summary,content,category,source_id,source_name,source_url,source_type,verification_status,authority_level,destination_id,experience_id,last_verified_at,next_verification_at,is_time_sensitive,is_active,created_at,metadata").order("created_at", { ascending: false }).limit(1000);
  const { data, error } = await query;
  if (error) return fail("Knowledge content could not be loaded.", 503);
  if (view === "review") {
    const rows = data ?? [];
    const evidence: CulturalEvidenceRecord[] = rows.map((row) => ({
      id: row.id, sourceId: row.source_id, title: row.title, content: row.content, summary: row.summary,
      category: row.category as CulturalEvidenceRecord["category"], sourceName: row.source_name ?? "Unknown source", sourceUrl: row.source_url ?? "",
      sourceType: row.source_type as CulturalEvidenceRecord["sourceType"], authorityLevel: row.authority_level,
      verificationStatus: row.verification_status as CulturalEvidenceRecord["verificationStatus"], destinationId: row.destination_id, experienceId: row.experience_id,
      language: null, lastVerifiedAt: row.last_verified_at, nextVerificationAt: row.next_verification_at,
      isTimeSensitive: row.is_time_sensitive, isActive: row.is_active, metadata: row.metadata as Record<string, unknown>,
    }));
    const conflicts = detectCulturalConflicts(evidence);
    const conflictingIds = new Set([...conflicts.values()].flat());
    const review = rows.filter((row) => row.verification_status === "pending_review" || conflictingIds.has(row.id) || row.is_active && isCulturalRecordStale({
      category: row.category as CulturalEvidenceRecord["category"], isTimeSensitive: row.is_time_sensitive, lastVerifiedAt: row.last_verified_at, nextVerificationAt: row.next_verification_at,
    }));
    return NextResponse.json({ content: review.map((row) => ({ ...row, hasConflict: conflictingIds.has(row.id) })) });
  }
  if (view === "overview") {
    const [sources, stale, conflicts] = await Promise.all([
      auth.supabase.from("cultural_sources").select("id", { count: "exact", head: true }).eq("is_active", true),
      auth.supabase.from("cultural_content").select("category,is_time_sensitive,last_verified_at,next_verification_at").eq("is_active", true).limit(1000),
      auth.supabase.from("cultural_content").select("id", { count: "exact", head: true }).eq("verification_status", "pending_review"),
    ]);
    const staleCount = stale.error || !stale.data || stale.data.length >= 1000 ? null : stale.data.filter((row) => isCulturalRecordStale({
      category: row.category as CulturalEvidenceRecord["category"], isTimeSensitive: row.is_time_sensitive, lastVerifiedAt: row.last_verified_at, nextVerificationAt: row.next_verification_at,
    })).length;
    return NextResponse.json({ content: data ?? [], counts: { activeSources: sources.error ? null : sources.count, staleContent: staleCount, awaitingReview: conflicts.error ? null : conflicts.count } });
  }
  return NextResponse.json({ content: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return fail("Invalid request origin.", 403);
  const auth = await getKnowledgeAdmin();
  if (!auth.authorized) return fail("Administrator access is required.", auth.user ? 403 : 401);
  const body = await request.text();
  if (body.length > 16000) return fail("Request is too large.", 413);
  let input: Record<string, unknown>;
  try { input = JSON.parse(body) as Record<string, unknown>; } catch { return fail("Invalid request body."); }
  const action = input.action;

  if (action === "create_source") {
    const parsed = sourceCreateSchema.safeParse(input.source);
    if (!parsed.success) return fail("Check the source details.");
    const baseUrl = new URL(parsed.data.baseUrl);
    if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.port) return fail("Source domains must use HTTPS and the standard port.");
    baseUrl.pathname = "/"; baseUrl.search = ""; baseUrl.hash = "";
    const { data, error } = await auth.supabase.from("cultural_sources").insert({
      name: parsed.data.name, title: parsed.data.name, publisher: parsed.data.name, source_url: baseUrl.href,
      base_url: baseUrl.origin, source_type: parsed.data.sourceType, authority_rank: parsed.data.authorityLevel * 20,
      authority_level: parsed.data.authorityLevel, language: parsed.data.language, status: "pending",
      default_verification_status: "unverified", is_active: false, allow_automatic_ingestion: false, notes: parsed.data.notes,
    }).select("id,name,base_url").single();
    if (error) return fail(error.code === "23505" ? "That base URL is already registered." : "Source could not be added.", 409);
    return NextResponse.json({ source: data }, { status: 201 });
  }

  if (action === "approve_domain") {
    const parsedSourceId = sourceIdSchema.safeParse(input.sourceId);
    if (!parsedSourceId.success) return fail("Source identifier is invalid.");
    const sourceId = parsedSourceId.data;
    if (input.confirmTermsReviewed !== true) return fail("Confirm that terms and access rules were reviewed.");
    const { data: source, error: sourceError } = await auth.supabase.from("cultural_sources").select("id,base_url,approved_domains,notes").eq("id", sourceId).maybeSingle();
    if (sourceError || !source) return fail("Source was not found.", 404);
    if (!source.base_url) return fail("Source base URL is missing.", 409);
    const url = new URL(source.base_url);
    const host = url.hostname.toLowerCase();
    const domains = [...new Set([...(source.approved_domains ?? []), host])];
    const reviewNotes = String(input.notes ?? "").trim();
    const notes = reviewNotes ? [source.notes, "Access review: " + reviewNotes].filter(Boolean).join("\n") : source.notes;
    const { error } = await auth.supabase.from("cultural_sources").update({ approved_domains: domains, is_active: true, status: "verified", terms_reviewed_at: new Date().toISOString(), terms_reviewed_by: auth.user.id, notes }).eq("id", sourceId);
    if (error) return fail("Domain approval could not be saved.", 503);
    return NextResponse.json({ approved: true, domain: host });
  }

  if (action === "approve_url") {
    const parsedSourceId = sourceIdSchema.safeParse(input.sourceId);
    if (!parsedSourceId.success) return fail("Source identifier is invalid.");
    const sourceId = parsedSourceId.data;
    const rawUrl = String(input.url ?? "");
    const { data: source, error } = await auth.supabase.from("cultural_sources").select("id,is_active,terms_reviewed_at,approved_domains,approved_urls").eq("id", sourceId).maybeSingle();
    if (error || !source) return fail("Source was not found.", 404);
    if (!source.is_active || !source.terms_reviewed_at) return fail("Review source terms and approve its domain first.", 409);
    let approvedUrl: URL;
    try { approvedUrl = validateApprovedUrl(rawUrl, source.approved_domains ?? []); } catch (error) { return fail(error instanceof Error ? error.message : "URL is not approved."); }
    const urls = [...new Set([...(source.approved_urls ?? []), approvedUrl.href])];
    const updated = await auth.supabase.from("cultural_sources").update({ approved_urls: urls }).eq("id", sourceId);
    if (updated.error) return fail("URL approval could not be saved.", 503);
    return NextResponse.json({ approved: true, url: approvedUrl.href });
  }

  if (action === "disable_source") {
    const parsedSourceId = sourceIdSchema.safeParse(input.sourceId);
    if (!parsedSourceId.success) return fail("Source identifier is invalid.");
    const sourceId = parsedSourceId.data;
    const { error } = await auth.supabase.from("cultural_sources").update({ is_active: false, status: "stale", allow_automatic_ingestion: false }).eq("id", sourceId);
    if (error) return fail("Source could not be disabled.", 503);
    return NextResponse.json({ disabled: true });
  }

  if (action === "preview_url") {
    const parsedSourceId = sourceIdSchema.safeParse(input.sourceId);
    if (!parsedSourceId.success) return fail("Source identifier is invalid.");
    const sourceId = parsedSourceId.data;
    const rawUrl = String(input.url ?? "");
    const rate = await auth.supabase.rpc("consume_cultural_ingestion_limit");
    if (rate.error) return fail("Ingestion protection is unavailable.", 503);
    if (!rate.data) return fail("Ingestion rate limit reached.", 429);
    const { data: source, error } = await auth.supabase.from("cultural_sources").select("id,name,source_type,authority_level,approved_domains,approved_urls,is_active,terms_reviewed_at").eq("id", sourceId).maybeSingle();
    if (error || !source) return fail("Source was not found.", 404);
    if (!source.is_active || !source.terms_reviewed_at || !(source.approved_urls ?? []).includes(rawUrl)) return fail("This exact URL and its source domain must be approved first.", 403);
    try {
      const fetched = await fetchApprovedSource(rawUrl, source.approved_domains ?? []);
      const blocks = extractSemanticBlocks(fetched.body);
      const chunks = await chunkSemanticBlocks(blocks);
      return NextResponse.json({ source: { id: source.id, name: source.name, sourceType: source.source_type, authorityLevel: source.authority_level }, selectedUrl: rawUrl, fetched: { url: fetched.url, contentType: fetched.contentType, retrievedAt: fetched.retrievedAt }, chunks });
    } catch (error) {
      return fail(error instanceof SourceFetchError ? error.message : "Source preview failed safely.", error instanceof SourceFetchError ? error.status : 502);
    }
  }

  if (action === "submit_chunk") {
    const parsed = contentSubmitSchema.safeParse(input.content);
    if (!parsed.success) return fail("Check the content fields.");
    const normalized = normalizeCulturalContent(parsed.data);
    const { data: source, error: sourceError } = await auth.supabase.from("cultural_sources").select("id,name,source_type,authority_level,approved_domains,approved_urls,is_active,terms_reviewed_at").eq("id", parsed.data.sourceId).maybeSingle();
    if (sourceError || !source || !source.is_active || !source.terms_reviewed_at || !source.approved_urls?.includes(parsed.data.sourceUrl)) return fail("Content source URL must be approved before submission.", 403);
    try { validateApprovedUrl(parsed.data.sourceUrl, source.approved_domains ?? []); } catch { return fail("Content source URL is outside the approved domain.", 403); }
    const contentHash = await hashContent(normalized.title + "\n" + normalized.content);
    const { data, error } = await auth.supabase.from("cultural_content").upsert({
      source_id: source.id, destination_id: parsed.data.destinationId ?? null, title: normalized.title, content: normalized.content,
      summary: normalized.summary, category: normalized.category, language: normalized.language, content_hash: contentHash,
      status: "pending", source_name: source.name, source_url: parsed.data.sourceUrl, source_type: source.source_type,
      verification_status: "pending_review", authority_level: source.authority_level, last_verified_at: null,
      next_verification_at: null, is_time_sensitive: parsed.data.isTimeSensitive, is_active: false, metadata: parsed.data.metadata as Json,
      original_language: normalized.language, canonical_source_url: typeof parsed.data.metadata.canonicalUrl === "string" ? parsed.data.metadata.canonicalUrl : parsed.data.sourceUrl,
      retrieved_at: parsed.data.retrievedAt ?? (parsed.data.metadata.manualEntry === true ? null : new Date().toISOString()),
    }, { onConflict: "source_id,content_hash", ignoreDuplicates: true }).select("id").maybeSingle();
    if (error) return fail("Content could not be staged for review.", 503);
    return NextResponse.json({ staged: Boolean(data), duplicate: !data, id: data?.id ?? null }, { status: 201 });
  }

  if (action === "review_content") {
    const parsed = reviewContentSchema.safeParse(input.content);
    if (!parsed.success) return fail("Review decision is invalid.");
    const approved = parsed.data.decision === "approve";
    const rejected = parsed.data.decision === "reject";
    const { data: current, error: currentError } = await auth.supabase.from("cultural_content").select("title,content,category,is_time_sensitive,source_id").eq("id", parsed.data.id).maybeSingle();
    if (currentError || !current) return fail("Content record was not found.", 404);
    const { data: currentSource, error: currentSourceError } = await auth.supabase.from("cultural_sources").select("source_type,authority_level").eq("id", current.source_id).maybeSingle();
    if (currentSourceError || !currentSource) return fail("Content source could not be verified.", 503);
    const verificationStatus = parsed.data.verificationStatus ?? (currentSource.source_type === "host" ? "community_verified" : "official_verified");
    if (approved && !canPublishCulturalVerification(currentSource.source_type as never, currentSource.authority_level, verificationStatus)) return fail("This source cannot receive the selected verification status.", 422);
    const sensitive = current.is_time_sensitive || ["opening_information", "festival"].includes(current.category ?? "");
    const nextVerificationAt = parsed.data.nextVerificationAt ?? new Date(Date.now() + (sensitive ? 6 * 3600000 : 180 * 86400000)).toISOString();
    const update: Database["public"]["Tables"]["cultural_content"]["Update"] = {
      status: approved ? "verified" : rejected ? "rejected" : "stale",
      verification_status: approved ? verificationStatus : rejected ? "rejected" : "unverified",
      is_active: approved, verified_at: approved ? new Date().toISOString() : null,
      last_verified_at: approved ? new Date().toISOString() : undefined,
      next_verification_at: approved ? nextVerificationAt : null,
      reviewed_by: auth.user.id,
      verification_note: approved ? "Reviewed and approved by an MICHI administrator." : rejected ? "Rejected by an MICHI administrator." : "Disabled by an MICHI administrator.",
    };
    if (approved && current.content) {
      const provider = getEmbeddingProvider();
      if (provider) {
        try {
          const embedding = await provider.embed(current.title + "\n" + current.content);
          update.embedding = "[" + embedding.values.join(",") + "]";
          update.embedding_model = embedding.model;
          update.embedding_dimensions = embedding.dimensions;
        } catch { /* Evidence publication does not depend on optional semantic indexing. */ }
      }
    }
    const { error } = await auth.supabase.from("cultural_content").update(update).eq("id", parsed.data.id);
    if (error) return fail("Review decision could not be saved.", 503);
    return NextResponse.json({ saved: true });
  }
  return fail("Unknown knowledge action.");
}
