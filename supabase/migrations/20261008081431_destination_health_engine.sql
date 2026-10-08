-- Destination health observations stay independent from destination descriptions.
-- Every component has its own provenance; no values are seeded for this table.
create table public.destination_health_signals (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  component_key text not null check (component_key in (
    'crowdPressure', 'remainingCapacity', 'communityReadiness',
    'transportAccessibility', 'seasonalSuitability'
  )),
  value smallint not null check (value between 0 and 100),
  data_mode text not null check (data_mode in ('live', 'snapshot', 'simulated')),
  truth_category text not null check (truth_category in ('official', 'community', 'host', 'simulated', 'unverified', 'stale')),
  source_name text not null check (length(trim(source_name)) > 0),
  source_url text not null check (source_url ~ '^https://[^[:space:]]+$'),
  source_type text not null check (length(trim(source_type)) > 0),
  source_authority smallint check (source_authority between 1 and 5),
  observed_at timestamptz not null,
  verified_at timestamptz,
  expires_at timestamptz not null,
  verification_status text not null check (verification_status in ('verified', 'unverified', 'stale')),
  created_at timestamptz not null default now(),
  constraint health_live_not_simulated check (
    data_mode <> 'live' or truth_category <> 'simulated'
  ),
  constraint health_simulation_explicit check (
    data_mode <> 'simulated' or truth_category = 'simulated'
  ),
  constraint health_verified_has_timestamp check (
    verification_status <> 'verified' or verified_at is not null
  )
);

create index destination_health_latest_idx
  on public.destination_health_signals(destination_id, component_key, observed_at desc);
create index destination_health_expiry_idx
  on public.destination_health_signals(expires_at)
  where verification_status = 'verified';

alter table public.destination_health_signals enable row level security;
grant select on public.destination_health_signals to anon, authenticated;
grant all privileges on public.destination_health_signals to service_role;

create policy destination_health_public_verified_read
  on public.destination_health_signals for select to anon, authenticated
  using (
    verification_status = 'verified'
    and verified_at is not null
    and expires_at > now()
    and exists (
      select 1 from public.destinations d
      where d.id = destination_health_signals.destination_id
        and d.status = 'published'
        and d.verification_status = 'verified_official'
        and d.data_status = 'official_tourism'
    )
  );

comment on table public.destination_health_signals is
  'Provenance-preserving 0-100 destination health observations. No demo values are seeded; simulated rows can never be labeled live.';

-- Anonymous analytics are limited to the four Phase 4 actions and contain only
-- a per-tab UUID plus the selected destination. No movement history or PII.
drop policy if exists analytics_owner_insert on public.analytics_events;
grant insert on public.analytics_events to anon, authenticated;
create policy destination_health_analytics_insert
  on public.analytics_events for insert to anon, authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and event_name in (
      'destination_health_viewed', 'alternative_shown',
      'alternative_selected', 'popular_destination_retained'
    )
    and session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and metadata - array['target_destination_id', 'alternative_count'] = '{}'::jsonb
    and length(metadata::text) <= 256
    and (not (metadata ? 'target_destination_id') or (metadata->>'target_destination_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    and (not (metadata ? 'alternative_count') or (metadata->>'alternative_count') ~ '^(?:[0-9]|10)$')
  );
