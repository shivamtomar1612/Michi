-- Phase 9: itinerary snapshots, decision history, safe sharing, and atomic reorder.
alter table public.itineraries
  add column share_token uuid unique;

alter table public.itinerary_items
  add column external_experience_id uuid references public.external_experiences(id) on delete set null,
  add column cultural_context_snapshot text not null default '',
  add column transport_estimate jsonb not null default '{"status":"unavailable","distance_km":null,"duration_minutes":null,"source":null}'::jsonb,
  add column data_status text not null default 'official_destination'
    check (data_status in ('official_destination', 'michi_verified', 'external_verified')),
  add column booking_mode text not null default 'not_applicable'
    check (booking_mode in ('michi', 'external', 'information_only', 'not_applicable')),
  add column availability_status text not null default 'not_applicable'
    check (availability_status in ('verified_available_at_check', 'not_integrated', 'not_applicable')),
  add column destination_health_score smallint
    check (destination_health_score is null or destination_health_score between 0 and 100),
  add column destination_health_status text not null default 'Unavailable',
  add column recommendation_score numeric(5,1)
    check (recommendation_score is null or recommendation_score between 0 and 100),
  add column interest_compatibility smallint
    check (interest_compatibility is null or interest_compatibility between 0 and 100),
  add column cost_status text not null default 'known'
    check (cost_status in ('known', 'unknown')),
  add column source_name text,
  add column source_url text,
  add column source_verified_at timestamptz,
  add column availability_checked_at timestamptz,
  add column suggestion_origin text not null default 'original_preference'
    check (suggestion_origin in ('original_preference', 'michi_alternative')),
  add constraint itinerary_item_inventory_reference check (
    not (experience_id is not null and external_experience_id is not null)
  ),
  add constraint itinerary_transport_estimate_object check (jsonb_typeof(transport_estimate) = 'object'),
  add constraint itinerary_source_url_https check (source_url is null or source_url ~ '^https://');

create index itinerary_items_external_experience_idx
  on public.itinerary_items(external_experience_id) where external_experience_id is not null;

create table public.itinerary_decisions (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  recommendation_log_id uuid not null references public.recommendation_logs(id) on delete cascade,
  experience_id uuid references public.experiences(id) on delete cascade,
  external_experience_id uuid references public.external_experiences(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'rejected', 'compared', 'kept_original')),
  suggestion_origin text not null check (suggestion_origin in ('original_preference', 'michi_alternative')),
  created_at timestamptz not null default now(),
  constraint itinerary_decision_candidate check (
    (experience_id is not null and external_experience_id is null)
    or (experience_id is null and external_experience_id is not null)
  )
);

create index itinerary_decisions_owner_recent_idx
  on public.itinerary_decisions(traveler_id, created_at desc);
create index itinerary_decisions_recommendation_idx
  on public.itinerary_decisions(recommendation_log_id, created_at desc);

alter table public.itinerary_decisions enable row level security;
revoke all on public.itinerary_decisions from anon, authenticated;
grant select, insert on public.itinerary_decisions to authenticated;
create policy itinerary_decisions_owner_read on public.itinerary_decisions
  for select to authenticated using (traveler_id = (select auth.uid()));
create policy itinerary_decisions_owner_insert on public.itinerary_decisions
  for insert to authenticated with check (
    traveler_id = (select auth.uid())
    and exists (
      select 1 from public.recommendation_logs rl
      where rl.id = recommendation_log_id and rl.traveler_id = (select auth.uid())
    )
    and (
      (experience_id is not null and exists (
        select 1 from public.recommendation_logs rl
        where rl.id = recommendation_log_id and exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(rl.recommendations) = 'array' then rl.recommendations else '[]'::jsonb end) rec
          where rec ->> 'id' = itinerary_decisions.experience_id::text and rec ->> 'pathway' = 'michi_verified'
        )
      ))
      or (external_experience_id is not null and exists (
        select 1 from public.recommendation_logs rl
        where rl.id = recommendation_log_id and exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(rl.recommendations) = 'array' then rl.recommendations else '[]'::jsonb end) rec
          where rec ->> 'id' = itinerary_decisions.external_experience_id::text and rec ->> 'pathway' = 'external_verified'
        )
      ))
    )
  );

create or replace function public.reorder_itinerary_items(p_itinerary_id uuid, p_item_ids uuid[])
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count bigint;
  updated_count bigint;
begin
  if not exists (
    select 1 from public.itineraries i
    where i.id = p_itinerary_id and i.traveler_id = (select auth.uid())
  ) then
    raise exception 'itinerary not found' using errcode = '42501';
  end if;

  select count(*) into expected_count from public.itinerary_items i
    where i.itinerary_id = p_itinerary_id;
  if coalesce(cardinality(p_item_ids), 0) <> expected_count
    or (select count(distinct item_id) from unnest(p_item_ids) as ids(item_id)) <> expected_count
    or exists (
      select 1 from unnest(p_item_ids) as ids(item_id)
      where not exists (
        select 1 from public.itinerary_items i
        where i.id = ids.item_id and i.itinerary_id = p_itinerary_id
      )
    ) then
    raise exception 'item order does not match itinerary' using errcode = '22023';
  end if;

  update public.itinerary_items i set sequence = ids.ordinality::integer
  from unnest(p_item_ids) with ordinality as ids(item_id, ordinality)
  where i.id = ids.item_id and i.itinerary_id = p_itinerary_id;
  get diagnostics updated_count = row_count;
  return updated_count = expected_count;
end;
$$;
revoke all on function public.reorder_itinerary_items(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_itinerary_items(uuid, uuid[]) to authenticated;

-- A bearer token can read only the explicit, traveler-approved shared fields.
create or replace function public.get_shared_itinerary(p_share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id,
    'name', i.name,
    'start_date', i.start_date,
    'end_date', i.end_date,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'title', item.title,
        'item_type', item.item_type,
        'starts_at', item.starts_at,
        'ends_at', item.ends_at,
        'sequence', item.sequence,
        'estimated_cost_jpy', item.estimated_cost_jpy,
        'cultural_context_snapshot', item.cultural_context_snapshot,
        'transport_estimate', item.transport_estimate,
        'data_status', item.data_status,
        'booking_mode', item.booking_mode,
        'availability_status', item.availability_status,
        'destination_health_score', item.destination_health_score,
        'destination_health_status', item.destination_health_status,
        'recommendation_score', item.recommendation_score,
        'source_name', item.source_name,
        'source_url', item.source_url
      ) order by item.sequence)
      from public.itinerary_items item where item.itinerary_id = i.id
    ), '[]'::jsonb)
  )
  from public.itineraries i
  where i.share_token = p_share_token and i.visibility = 'shared';
$$;
revoke all on function public.get_shared_itinerary(uuid) from public;
grant execute on function public.get_shared_itinerary(uuid) to anon, authenticated;

comment on column public.itinerary_items.transport_estimate is
  'Provider-backed route estimates only. Unavailable is the honest default; straight-line distance is not a route estimate.';
comment on column public.itineraries.share_token is
  'Revocable random bearer token for an explicitly shared itinerary. Public RPC returns only sanitized itinerary fields.';
