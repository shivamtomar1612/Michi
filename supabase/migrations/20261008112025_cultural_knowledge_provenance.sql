-- Preserve the retrieval lifecycle and reviewer provenance on each evidence chunk.
alter table public.cultural_sources
  add constraint cultural_sources_type_check check (source_type in (
    'government','national_tourism_board','prefecture','municipality','dmo','cultural_institution','temple_shrine','museum','host','editorial'
  )),
  add constraint cultural_sources_authority_check check (authority_level between 1 and 5),
  add constraint cultural_sources_default_verification_check check (default_verification_status in ('official_verified','community_verified','pending_review','rejected','unverified'));

alter table public.cultural_content
  add column if not exists original_language text,
  add column if not exists canonical_source_url text,
  add column if not exists retrieved_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists verification_note text;

update public.cultural_content
set original_language = coalesce(original_language, metadata ->> 'original_language', language),
    canonical_source_url = coalesce(canonical_source_url, metadata ->> 'canonical_source_url', source_url),
    retrieved_at = coalesce(retrieved_at, nullif(metadata ->> 'retrieved_at', '')::timestamptz, created_at)
where original_language is null or canonical_source_url is null or retrieved_at is null;

alter table public.cultural_content
  add constraint cultural_content_source_type_check check (source_type in (
    'government','national_tourism_board','prefecture','municipality','dmo','cultural_institution','temple_shrine','museum','host','editorial'
  )),
  add constraint cultural_content_verification_check check (verification_status in ('official_verified','community_verified','pending_review','rejected','unverified'));

create index if not exists cultural_content_reviewer_idx on public.cultural_content(reviewed_by, last_verified_at desc);

create or replace function public.sync_verified_host_cultural_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sid uuid; current_source_url text; rule_text text;
begin
  current_source_url := 'michi://hosts/' || new.id::text;
  update public.cultural_content set is_active = false, updated_at = now()
  where experience_id = new.id and source_type = 'host';
  if new.is_verified and new.status = 'published' and not new.is_paused
    and exists (select 1 from public.host_applications a where a.applicant_id = new.host_id and a.status = 'verified')
    and jsonb_typeof(new.rules) = 'object' and new.rules <> '{}'::jsonb then
    insert into public.cultural_sources(name, title, publisher, source_url, base_url, source_type, authority_rank, authority_level, language, status, default_verification_status, is_active, allow_automatic_ingestion, notes)
    values ('Verified host rules', 'Host rules for ' || new.title, 'MICHI verified host', current_source_url, null, 'host', 100, 5, coalesce(new.languages[1], 'en'), 'verified', 'community_verified', true, false, 'Rules are supplied by and scoped to this verified MICHI experience.')
    on conflict (source_url) do update set title = excluded.title, language = excluded.language, status = 'verified', is_active = true, updated_at = now()
    returning id into sid;
    rule_text := jsonb_pretty(new.rules) || E'\nPhotography policy: ' || coalesce(new.photography_policy, 'not stated') || E'\nBooking policy: ' || coalesce(new.booking_policy::text, 'not stated');
    insert into public.cultural_content(source_id, destination_id, experience_id, title, content, summary, category, language, original_language, content_hash, status, source_name, source_url, canonical_source_url, source_type, verification_status, authority_level, last_verified_at, next_verification_at, retrieved_at, is_active, metadata)
    values (sid, new.destination_id, new.id, 'Rules for ' || new.title, rule_text, left(rule_text, 280), 'host_rule', coalesce(new.languages[1], 'en'), coalesce(new.languages[1], 'en'), encode(sha256(convert_to(rule_text, 'UTF8')), 'hex'), 'verified', 'Verified MICHI host', current_source_url, current_source_url, 'host', 'community_verified', 5, now(), now() + interval '90 days', now(), true, jsonb_build_object('conflictKey', 'host-rule:' || new.id::text, 'scope', 'experience'))
    on conflict (source_id, content_hash) do update set content = excluded.content, summary = excluded.summary, is_active = true, last_verified_at = now(), retrieved_at = now(), updated_at = now();
  end if;
  return new;
end;
$$;
revoke all on function public.sync_verified_host_cultural_rules() from public, anon, authenticated;
