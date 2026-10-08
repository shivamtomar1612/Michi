-- Phase 6: provenance-aware cultural knowledge. Additive and preserves legacy records.
create extension if not exists vector with schema extensions;

alter table public.cultural_sources
  add column if not exists name text,
  add column if not exists base_url text,
  add column if not exists source_type text not null default 'editorial',
  add column if not exists authority_level smallint not null default 1,
  add column if not exists default_verification_status text not null default 'unverified',
  add column if not exists country text not null default 'JP',
  add column if not exists region text,
  add column if not exists prefecture text,
  add column if not exists city text,
  add column if not exists is_active boolean not null default false,
  add column if not exists allow_automatic_ingestion boolean not null default false,
  add column if not exists approved_domains text[] not null default '{}',
  add column if not exists approved_urls text[] not null default '{}',
  add column if not exists terms_reviewed_at timestamptz,
  add column if not exists terms_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists notes text not null default '';

update public.cultural_sources
set name = coalesce(name, metadata ->> 'source_name', publisher, title),
    base_url = coalesce(base_url, regexp_replace(source_url, '^(https?://[^/]+).*$', '\1')),
    source_type = case
      when source_url like '%bunka.go.jp%' or source_url like '%mlit.go.jp%' then 'government'
      when source_url like '%japan.travel%' then 'national_tourism_board'
      when source_url like '%kyoto.travel%' then 'dmo'
      when source_url like '%visitkanazawa.jp%' then 'dmo'
      else source_type end,
    authority_level = case when metadata ->> 'authority_level' ~ '^[1-5]$' then (metadata ->> 'authority_level')::smallint when authority_rank >= 80 then 5 when authority_rank >= 60 then 4 when authority_rank >= 40 then 3 when authority_rank >= 20 then 2 else 1 end,
    default_verification_status = case when status = 'verified' then 'official_verified' else 'unverified' end,
    is_active = (status = 'verified'),
    approved_domains = case
      when source_url like '%bunka.go.jp%' then array['bunka.go.jp']
      when source_url like '%mlit.go.jp%' then array['mlit.go.jp']
      when source_url like '%japan.travel%' then array['japan.travel']
      when source_url like '%kyoto.travel%' then array['kyoto.travel']
      when source_url like '%visitkanazawa.jp%' then array['visitkanazawa.jp']
      else approved_domains end;

alter table public.cultural_sources alter column name set not null;
create unique index if not exists cultural_sources_base_url_unique on public.cultural_sources(base_url) where base_url is not null;
create index if not exists cultural_sources_active_authority_idx on public.cultural_sources(is_active, authority_level desc);

alter table public.cultural_content
  add column if not exists summary text,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists experience_id uuid references public.experiences(id) on delete cascade,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_type text not null default 'editorial',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists authority_level smallint not null default 1,
  add column if not exists location_scope jsonb not null default '{}'::jsonb,
  add column if not exists effective_from timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists next_verification_at timestamptz,
  add column if not exists is_time_sensitive boolean not null default false,
  add column if not exists is_active boolean not null default false,
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'C')
  ) stored,
  add column if not exists embedding extensions.vector,
  add column if not exists embedding_model text,
  add column if not exists embedding_dimensions integer;

update public.cultural_content c
set summary = coalesce(c.summary, left(c.content, 280)),
    source_name = coalesce(c.source_name, s.name, s.title),
    source_url = coalesce(c.source_url, s.source_url),
    source_type = s.source_type,
    verification_status = case when c.status = 'verified' then 'official_verified' else 'unverified' end,
    authority_level = coalesce(nullif(c.authority_level, 1), s.authority_level),
    last_verified_at = coalesce(c.last_verified_at, c.verified_at, s.verified_at),
    next_verification_at = coalesce(c.next_verification_at, c.stale_after, s.stale_after),
    is_active = (c.status = 'verified'),
    category = coalesce(c.category, 'local_custom'),
    location_scope = case when c.metadata ->> 'location_scope' is not null then jsonb_build_object('label', c.metadata ->> 'location_scope') else c.location_scope end
from public.cultural_sources s
where s.id = c.source_id;

alter table public.cultural_content
  add constraint cultural_content_category_check check (category is null or category in (
    'etiquette','photography','temple_shrine','onsen','food','restaurant','transport','public_behavior',
    'traditional_craft','history','architecture','festival','accessibility','dietary','language','local_custom',
    'host_rule','safety','opening_information'
  )),
  add constraint cultural_content_authority_check check (authority_level between 1 and 5),
  add constraint cultural_content_embedding_dimensions_check check (embedding_dimensions is null or embedding_dimensions > 0);

create index if not exists cultural_content_search_gin_idx on public.cultural_content using gin(search_vector);
create index if not exists cultural_content_category_scope_idx on public.cultural_content(category, destination_id, experience_id) where is_active;
create index if not exists cultural_content_review_idx on public.cultural_content(verification_status, next_verification_at, created_at desc);
create index if not exists cultural_content_source_hash_idx on public.cultural_content(source_id, content_hash);

-- Domains are present for future explicit approval. Ingestion remains disabled until an administrator reviews access terms.
insert into public.cultural_sources (name, title, publisher, source_url, base_url, source_type, authority_rank, authority_level, language, status, default_verification_status, is_active, allow_automatic_ingestion, approved_domains, notes)
values
  ('Japan Tourism Agency', 'Japan Tourism Agency', 'Ministry of Land, Infrastructure, Transport and Tourism', 'https://www.mlit.go.jp/kankocho/', 'https://www.mlit.go.jp', 'government', 100, 5, 'en', 'verified', 'official_verified', true, false, array['mlit.go.jp'], 'Official national tourism authority. Domain registry only; each URL requires admin approval and access review.'),
  ('JNTO', 'Japan National Tourism Organization', 'Japan National Tourism Organization', 'https://www.japan.travel/en/', 'https://www.japan.travel', 'national_tourism_board', 80, 4, 'en', 'verified', 'official_verified', true, false, array['japan.travel'], 'Official national tourism board. Domain registry only; each URL requires admin approval and access review.'),
  ('Agency for Cultural Affairs', 'Agency for Cultural Affairs', 'Government of Japan', 'https://www.bunka.go.jp/english/', 'https://www.bunka.go.jp', 'government', 100, 5, 'en', 'verified', 'official_verified', true, false, array['bunka.go.jp'], 'Official cultural authority. Domain registry only; each URL requires admin approval and access review.'),
  ('Kyoto City Official Travel Guide', 'Kyoto City Official Travel Guide', 'Kyoto City Tourism Association', 'https://kyoto.travel/en/', 'https://kyoto.travel', 'dmo', 80, 4, 'en', 'verified', 'official_verified', true, false, array['kyoto.travel'], 'Official city tourism guide. Domain registry only; each URL requires admin approval and access review.'),
  ('Kanazawa authority placeholder', 'Kanazawa authority placeholder', 'Pending official URL confirmation', 'https://visitkanazawa.jp/en/', 'https://visitkanazawa.jp', 'dmo', 0, 1, 'en', 'pending', 'unverified', false, false, '{}', 'Disabled placeholder; activate only after the official URL, terms and access rules are reviewed.'),
  ('Takayama authority placeholder', 'Takayama authority placeholder', 'Pending official URL confirmation', 'https://www.hidatakayama.or.jp/', 'https://www.hidatakayama.or.jp', 'municipality', 0, 1, 'en', 'pending', 'unverified', false, false, '{}', 'Disabled placeholder; activate only after the official URL, terms and access rules are reviewed.')
on conflict (base_url) where base_url is not null do nothing;

create table if not exists public.cultural_ingestion_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
alter table public.cultural_ingestion_attempts enable row level security;
revoke all on public.cultural_ingestion_attempts from anon, authenticated;

create or replace function public.consume_cultural_ingestion_limit()
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if (select count(*) from public.cultural_ingestion_attempts a where a.user_id = uid and a.attempted_at > now() - interval '1 minute') >= 10 then return false; end if;
  insert into public.cultural_ingestion_attempts(user_id) values (uid);
  return true;
end;
$$;
revoke all on function public.consume_cultural_ingestion_limit() from public, anon;
grant execute on function public.consume_cultural_ingestion_limit() to authenticated;

create table if not exists public.cultural_evidence_requests (
  id bigint generated always as identity primary key,
  requester_hash text not null,
  requested_at timestamptz not null default now()
);
create index if not exists cultural_evidence_requests_lookup_idx on public.cultural_evidence_requests(requester_hash, requested_at desc);
alter table public.cultural_evidence_requests enable row level security;
revoke all on public.cultural_evidence_requests from anon, authenticated;
create or replace function public.consume_cultural_evidence_limit(p_requester_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_requester_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_requester_hash, 0));
  if (select count(*) from public.cultural_evidence_requests r where r.requester_hash = p_requester_hash and r.requested_at > now() - interval '1 minute') >= 30 then return false; end if;
  insert into public.cultural_evidence_requests(requester_hash) values (p_requester_hash);
  return true;
end;
$$;
revoke all on function public.consume_cultural_evidence_limit(text) from public;
grant execute on function public.consume_cultural_evidence_limit(text) to anon, authenticated;

create or replace function public.match_cultural_content(
  query_embedding extensions.vector,
  match_count integer default 10,
  match_destination_id uuid default null,
  match_experience_id uuid default null,
  match_category text default null,
  match_language text default null,
  requested_model text default null
)
returns table (id uuid, similarity double precision)
language sql stable security invoker set search_path = '' as $$
  select c.id, 1 - (c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.cultural_content c
  join public.cultural_sources s on s.id = c.source_id
  where c.embedding is not null
    and c.is_active
    and c.verification_status in ('official_verified', 'community_verified')
    and s.is_active
    and (requested_model is null or c.embedding_model = requested_model)
    and c.embedding_dimensions = extensions.vector_dims(query_embedding)
    and (match_destination_id is null or c.destination_id is null or c.destination_id = match_destination_id)
    and (match_experience_id is null or c.experience_id is null or c.experience_id = match_experience_id)
    and (match_category is null or c.category = match_category)
    and (match_language is null or c.language = match_language)
  order by c.embedding OPERATOR(extensions.<=>) query_embedding
  limit greatest(1, least(match_count, 20));
$$;
revoke all on function public.match_cultural_content(extensions.vector, integer, uuid, uuid, text, text, text) from public;
grant execute on function public.match_cultural_content(extensions.vector, integer, uuid, uuid, text, text, text) to anon, authenticated;

create or replace function public.sync_verified_host_cultural_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sid uuid; current_source_url text; rule_text text;
begin
  current_source_url := 'michi://hosts/' || new.id::text;
  update public.cultural_content set is_active = false, updated_at = now()
  where experience_id = new.id and source_type = 'host';
  if new.is_verified and new.status = 'published' and not new.is_paused and jsonb_typeof(new.rules) = 'object' and new.rules <> '{}'::jsonb then
    insert into public.cultural_sources(name, title, publisher, source_url, base_url, source_type, authority_rank, authority_level, language, status, default_verification_status, is_active, allow_automatic_ingestion, notes)
    values ('Verified host rules', 'Host rules for ' || new.title, 'MICHI verified host', current_source_url, null, 'host', 100, 5, coalesce(new.languages[1], 'en'), 'verified', 'community_verified', true, false, 'Rules are supplied by and scoped to this verified MICHI experience.')
    on conflict (source_url) do update set title = excluded.title, language = excluded.language, status = 'verified', is_active = true, updated_at = now()
    returning id into sid;
    rule_text := jsonb_pretty(new.rules) || E'\nPhotography policy: ' || coalesce(new.photography_policy, 'not stated') || E'\nBooking policy: ' || coalesce(new.booking_policy::text, 'not stated');
    insert into public.cultural_content(source_id, destination_id, experience_id, title, content, summary, category, language, content_hash, status, source_name, source_url, source_type, verification_status, authority_level, last_verified_at, next_verification_at, is_active, metadata)
    values (sid, new.destination_id, new.id, 'Rules for ' || new.title, rule_text, left(rule_text, 280), 'host_rule', coalesce(new.languages[1], 'en'), md5(rule_text), 'verified', 'Verified MICHI host', current_source_url, 'host', 'community_verified', 5, now(), now() + interval '90 days', true, jsonb_build_object('conflictKey', 'host-rule:' || new.id::text, 'scope', 'experience'))
    on conflict (source_id, content_hash) do update set content = excluded.content, summary = excluded.summary, is_active = true, last_verified_at = now(), updated_at = now();
  end if;
  return new;
end;
$$;
revoke all on function public.sync_verified_host_cultural_rules() from public, anon, authenticated;
drop trigger if exists experiences_sync_cultural_rules on public.experiences;
create trigger experiences_sync_cultural_rules after insert or update of rules, photography_policy, booking_policy, status, is_verified, is_paused, title, destination_id on public.experiences for each row execute function public.sync_verified_host_cultural_rules();

drop policy if exists cultural_sources_verified_read on public.cultural_sources;
drop policy if exists cultural_content_verified_read on public.cultural_content;
create policy cultural_sources_published_read on public.cultural_sources for select to anon, authenticated using (is_active and status = 'verified');
create policy cultural_sources_admin_manage on public.cultural_sources for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy cultural_content_published_read on public.cultural_content for select to anon, authenticated using (
  is_active and verification_status in ('official_verified', 'community_verified')
  and last_verified_at is not null
  and (next_verification_at is null or next_verification_at > now())
  and ((is_time_sensitive or category in ('opening_information','festival')) and last_verified_at > now() - interval '6 hours'
       or not (is_time_sensitive or category in ('opening_information','festival')) and last_verified_at > now() - interval '180 days')
  and exists (select 1 from public.cultural_sources s where s.id = source_id and s.is_active and s.status = 'verified')
  and (experience_id is null or exists (select 1 from public.experiences e where e.id = experience_id and e.is_verified and e.status = 'published' and not e.is_paused))
);
create policy cultural_content_admin_manage on public.cultural_content for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

grant select on public.cultural_sources, public.cultural_content to anon, authenticated;
grant insert, update on public.cultural_sources, public.cultural_content to authenticated;
