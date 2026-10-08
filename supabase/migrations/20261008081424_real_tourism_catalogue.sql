-- Provenance-first tourism catalogue. Public data is inserted only from the
-- reviewed seed snapshot; operational/health signals remain separate.

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null unique,
  source_type text not null,
  authority_level smallint not null check (authority_level between 1 and 5),
  region text,
  prefecture text,
  city text,
  is_official boolean not null default false,
  is_active boolean not null default false,
  retrieval_method text not null default 'manual_review',
  terms_url text,
  robots_status text not null default 'not_checked',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger data_sources_updated_at before update on public.data_sources
for each row execute function public.set_updated_at();

alter table public.destinations
  add column name_ja text,
  add column city text,
  add column country text not null default 'Japan',
  add column source_id uuid references public.data_sources(id) on delete restrict,
  add column source_name text,
  add column source_type text,
  add column source_authority smallint check (source_authority between 1 and 5),
  add column retrieved_at timestamptz,
  add column verification_status text not null default 'unknown',
  add column data_status text not null default 'unknown',
  add column coordinate_source text,
  add column coordinate_verified_at timestamptz,
  add column next_verification_at timestamptz,
  add column content_hash text;

create index destinations_source_id_idx on public.destinations(source_id);
create index destinations_data_status_idx on public.destinations(data_status, verification_status);
alter table public.destinations add constraint destinations_verified_requires_provenance check (
  data_status not in ('verified_official','official_tourism') or
  (source_id is not null and source_url is not null and source_name is not null and source_type is not null
    and source_authority is not null and retrieved_at is not null and last_verified_at is not null)
);

drop policy destinations_published_read on public.destinations;
create policy destinations_published_read on public.destinations for select to anon, authenticated using (
  status = 'published' and data_status = 'official_tourism' and verification_status = 'verified_official'
  and source_id is not null and source_url is not null and last_verified_at is not null
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  name text not null,
  name_ja text,
  slug text not null unique,
  place_type text not null check (place_type in ('temple','shrine','garden','museum','historic_district','market','cultural_center','traditional_house','castle','craft_center','heritage_site','other')),
  description text,
  short_description text,
  latitude double precision,
  longitude double precision,
  coordinate_source text,
  coordinate_verified_at timestamptz,
  official_url text,
  address text,
  opening_hours_text text,
  opening_hours_source text,
  opening_hours_verified_at timestamptz,
  admission_text text,
  accessibility jsonb,
  accessibility_status text not null default 'unknown' check (accessibility_status in ('verified','unknown','needs_review')),
  photography_policy text,
  cultural_context text,
  image_url text,
  image_source text,
  image_license text,
  image_attribution text,
  image_usage_status text not null default 'unknown' check (image_usage_status in ('approved','external_reference','unknown','do_not_display')),
  source_name text not null,
  source_url text not null,
  canonical_source_url text not null,
  source_type text not null,
  source_authority smallint not null check (source_authority between 1 and 5),
  retrieved_at timestamptz not null,
  last_verified_at timestamptz not null,
  next_verification_at timestamptz,
  verification_status text not null default 'needs_review',
  data_status text not null default 'unknown',
  original_language text,
  location_scope text,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_coordinates check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180)),
  unique (source_id, canonical_source_url)
);

create index places_destination_id_idx on public.places(destination_id);
create index places_source_id_idx on public.places(source_id);
create index places_public_search_idx on public.places using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(name_ja,'') || ' ' || coalesce(place_type,'')));
create trigger places_updated_at before update on public.places
for each row execute function public.set_updated_at();
alter table public.places add constraint places_verified_requires_provenance check (
  data_status not in ('verified_official','verified_primary','official_tourism') or
  (source_id is not null and source_url <> '' and canonical_source_url <> '' and source_name <> '' and source_type <> '' and last_verified_at is not null)
);

-- Third-party listings are deliberately separate from experiences, whose host_id
-- and slots represent MICHI-managed host participation and booking.
create table public.external_experiences (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  operator_name text not null,
  title text not null,
  slug text not null unique,
  short_description text,
  category text,
  duration_minutes integer,
  price_text text,
  price_min_jpy integer,
  price_max_jpy integer,
  price_verified_at timestamptz,
  external_booking_url text,
  official_url text not null,
  booking_mode text not null default 'external' check (booking_mode in ('external','information_only')),
  listing_source text not null default 'external_official_listing' check (listing_source = 'external_official_listing'),
  michi_booking_enabled boolean not null default false check (michi_booking_enabled = false),
  accessibility jsonb,
  accessibility_status text not null default 'unknown' check (accessibility_status in ('verified','unknown','needs_review')),
  image_url text,
  image_source text,
  image_license text,
  image_attribution text,
  image_usage_status text not null default 'do_not_display' check (image_usage_status in ('approved','external_reference','unknown','do_not_display')),
  source_name text not null,
  source_url text not null,
  canonical_source_url text not null,
  source_type text not null,
  source_authority smallint not null check (source_authority between 1 and 5),
  retrieved_at timestamptz not null,
  last_verified_at timestamptz not null,
  next_verification_at timestamptz,
  verification_status text not null default 'needs_review',
  data_status text not null default 'unknown',
  original_language text,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, canonical_source_url),
  check (price_min_jpy is null or price_min_jpy >= 0),
  check (price_max_jpy is null or price_max_jpy >= 0),
  check (price_min_jpy is null or price_max_jpy is null or price_max_jpy >= price_min_jpy)
);

create index external_experiences_destination_idx on public.external_experiences(destination_id);
create index external_experiences_public_search_idx on public.external_experiences using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(operator_name,'') || ' ' || coalesce(category,'')));
create trigger external_experiences_updated_at before update on public.external_experiences
for each row execute function public.set_updated_at();
alter table public.external_experiences add constraint external_verified_requires_provenance check (
  data_status not in ('verified_official','verified_primary','official_tourism') or
  (source_id is not null and source_url <> '' and canonical_source_url <> '' and source_name <> '' and source_type <> '' and last_verified_at is not null)
);

alter table public.data_sources enable row level security;
alter table public.places enable row level security;
alter table public.external_experiences enable row level security;

create policy data_sources_active_read on public.data_sources for select to anon, authenticated using (is_active);
create policy places_verified_read on public.places for select to anon, authenticated using (
  verification_status = 'verified_official' and data_status in ('verified_official','official_tourism')
);
create policy external_experiences_verified_read on public.external_experiences for select to anon, authenticated using (
  verification_status in ('verified_official','verified_primary') and data_status in ('verified_official','verified_primary','official_tourism')
);

grant select on public.data_sources, public.places, public.external_experiences to anon, authenticated;
grant all privileges on public.data_sources, public.places, public.external_experiences to service_role;
