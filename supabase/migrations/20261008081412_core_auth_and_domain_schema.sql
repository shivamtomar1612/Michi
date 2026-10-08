-- MICHI core schema: identity, responsible discovery, bookings, provenance and privacy.
create type public.app_role as enum ('traveler', 'host', 'dmo', 'admin');
create type public.destination_status as enum ('draft', 'published', 'archived');
create type public.experience_status as enum ('draft', 'published', 'paused', 'archived');
create type public.slot_status as enum ('open', 'full', 'cancelled', 'closed');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'refunded');
create type public.itinerary_visibility as enum ('private', 'shared');
create type public.itinerary_status as enum ('draft', 'planned', 'completed', 'archived');
create type public.cultural_source_status as enum ('pending', 'verified', 'stale', 'rejected');
create type public.feedback_sentiment as enum ('positive', 'neutral', 'negative');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  nationality text,
  preferred_language text not null default 'en',
  role public.app_role not null default 'traveler',
  accessibility_preferences jsonb not null default '{}'::jsonb,
  dietary_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_length check (char_length(full_name) <= 120),
  constraint profiles_language_length check (char_length(preferred_language) between 2 and 16)
);

-- Only display data is read from user metadata. Role is always assigned as traveler.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  prefecture text not null,
  region text not null,
  description text not null default '',
  latitude double precision,
  longitude double precision,
  cultural_summary text not null default '',
  image_url text,
  popularity_score smallint not null default 0 check (popularity_score between 0 and 100),
  crowd_score smallint not null default 0 check (crowd_score between 0 and 100),
  capacity_score smallint not null default 0 check (capacity_score between 0 and 100),
  community_score smallint not null default 0 check (community_score between 0 and 100),
  transport_score smallint not null default 0 check (transport_score between 0 and 100),
  health_score smallint not null default 0 check (health_score between 0 and 100),
  status public.destination_status not null default 'draft',
  data_source text not null default 'unverified',
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destinations_coordinates check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete restrict,
  destination_id uuid not null references public.destinations(id) on delete restrict,
  title text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  cultural_context text not null default '',
  price_jpy integer not null default 0 check (price_jpy >= 0),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  max_capacity integer not null check (max_capacity > 0 and max_capacity <= 1000),
  accessibility jsonb not null default '{}'::jsonb,
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  rules jsonb not null default '{}'::jsonb,
  photography_policy text not null default 'ask_host',
  booking_policy jsonb not null default '{}'::jsonb,
  meeting_point text not null default '',
  latitude double precision,
  longitude double precision,
  status public.experience_status not null default 'draft',
  is_verified boolean not null default false,
  is_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_coordinates check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.experience_slots (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  booked_count integer not null default 0 check (booked_count >= 0 and booked_count <= capacity),
  status public.slot_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, experience_id),
  constraint experience_slots_time check (ends_at > starts_at)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique default upper(replace(gen_random_uuid()::text, '-', '')),
  traveler_id uuid not null references public.profiles(id) on delete restrict,
  experience_id uuid not null references public.experiences(id) on delete restrict,
  slot_id uuid not null,
  guests integer not null check (guests > 0 and guests <= 100),
  total_price_jpy integer not null check (total_price_jpy >= 0),
  status public.booking_status not null default 'pending',
  rule_acknowledgment jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_slot_experience_match foreign key (slot_id, experience_id) references public.experience_slots(id, experience_id) on delete restrict
);

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  budget_jpy integer check (budget_jpy is null or budget_jpy >= 0),
  interests jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  visibility public.itinerary_visibility not null default 'private',
  status public.itinerary_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_dates check (start_date is null or end_date is null or end_date >= start_date)
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  experience_id uuid references public.experiences(id) on delete set null,
  item_type text not null check (item_type in ('destination', 'experience', 'note', 'travel')),
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  sequence integer not null default 0,
  rationale text not null default '',
  estimated_cost_jpy integer not null default 0 check (estimated_cost_jpy >= 0),
  crowd_score smallint check (crowd_score is null or crowd_score between 0 and 100),
  local_benefit_score smallint check (local_benefit_score is null or local_benefit_score between 0 and 100),
  created_at timestamptz not null default now(),
  constraint itinerary_item_time check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.cultural_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text not null unique,
  publisher text not null,
  authority_rank smallint not null default 0 check (authority_rank between 0 and 100),
  language text not null default 'ja',
  status public.cultural_source_status not null default 'pending',
  verified_at timestamptz,
  stale_after timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cultural_content (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.cultural_sources(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  title text not null,
  content text not null,
  language text not null default 'ja',
  content_hash text not null,
  status public.cultural_source_status not null default 'pending',
  verified_at timestamptz,
  stale_after timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, content_hash)
);

create table public.community_feedback (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  host_id uuid references public.profiles(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  sentiment public.feedback_sentiment not null,
  pressure_score smallint check (pressure_score is null or pressure_score between 0 and 100),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table public.traveler_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  cultural_depth_score smallint not null check (cultural_depth_score between 1 and 5),
  host_rating smallint not null check (host_rating between 1 and 5),
  understanding_score smallint not null check (understanding_score between 1 and 5),
  preparation_helpfulness smallint not null check (preparation_helpfulness between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table public.passport_achievements (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  description text not null default '',
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (traveler_id, type)
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text not null,
  event_name text not null,
  destination_id uuid references public.destinations(id) on delete set null,
  experience_id uuid references public.experiences(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_event_name check (char_length(event_name) between 1 and 100),
  constraint analytics_session_id check (char_length(session_id) between 1 and 128)
);

create table public.recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  input_context jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  selected_recommendation_id uuid,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index destinations_status_region_idx on public.destinations(status, region);
create index destinations_prefecture_idx on public.destinations(prefecture);
create index destinations_health_idx on public.destinations(health_score desc, crowd_score);
create index destinations_verified_idx on public.destinations(last_verified_at);
create index experiences_host_idx on public.experiences(host_id);
create index experiences_destination_status_idx on public.experiences(destination_id, status);
create index experiences_interests_idx on public.experiences using gin(interests);
create index experience_slots_lookup_idx on public.experience_slots(experience_id, starts_at) where status = 'open';
create index bookings_traveler_idx on public.bookings(traveler_id, created_at desc);
create index bookings_experience_idx on public.bookings(experience_id, created_at desc);
create index bookings_slot_idx on public.bookings(slot_id);
create index itineraries_owner_idx on public.itineraries(traveler_id, updated_at desc);
create index itinerary_items_order_idx on public.itinerary_items(itinerary_id, sequence);
create index cultural_sources_status_rank_idx on public.cultural_sources(status, authority_rank desc);
create index cultural_content_destination_idx on public.cultural_content(destination_id, status);
create index community_feedback_destination_idx on public.community_feedback(destination_id, created_at desc);
create index community_feedback_host_idx on public.community_feedback(host_id, created_at desc);
create index analytics_events_destination_date_idx on public.analytics_events(destination_id, created_at desc);
create index analytics_events_experience_date_idx on public.analytics_events(experience_id, created_at desc);
create index recommendation_logs_owner_idx on public.recommendation_logs(traveler_id, created_at desc);
create index notifications_owner_idx on public.notifications(user_id, created_at desc);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger destinations_updated_at before update on public.destinations for each row execute function public.set_updated_at();
create trigger experiences_updated_at before update on public.experiences for each row execute function public.set_updated_at();
create trigger slots_updated_at before update on public.experience_slots for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger itineraries_updated_at before update on public.itineraries for each row execute function public.set_updated_at();
create trigger cultural_sources_updated_at before update on public.cultural_sources for each row execute function public.set_updated_at();
create trigger cultural_content_updated_at before update on public.cultural_content for each row execute function public.set_updated_at();

create or replace function public.current_app_role()
returns public.app_role language sql stable security invoker set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;
revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.cultural_sources enable row level security;
alter table public.cultural_content enable row level security;
alter table public.community_feedback enable row level security;
alter table public.traveler_feedback enable row level security;
alter table public.passport_achievements enable row level security;
alter table public.analytics_events enable row level security;
alter table public.recommendation_logs enable row level security;
alter table public.notifications enable row level security;

revoke all on public.profiles, public.destinations, public.experiences, public.experience_slots,
  public.bookings, public.itineraries, public.itinerary_items, public.cultural_sources,
  public.cultural_content, public.community_feedback, public.traveler_feedback,
  public.passport_achievements, public.analytics_events, public.recommendation_logs,
  public.notifications from anon, authenticated;
grant all privileges on public.profiles, public.destinations, public.experiences,
  public.experience_slots, public.bookings, public.itineraries, public.itinerary_items,
  public.cultural_sources, public.cultural_content, public.community_feedback,
  public.traveler_feedback, public.passport_achievements, public.analytics_events,
  public.recommendation_logs, public.notifications to service_role;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, nationality, preferred_language, accessibility_preferences, dietary_preferences) on public.profiles to authenticated;
grant select on public.destinations, public.experiences, public.experience_slots, public.cultural_sources, public.cultural_content to anon, authenticated;
grant select on public.bookings, public.itineraries, public.itinerary_items, public.community_feedback, public.traveler_feedback, public.passport_achievements, public.recommendation_logs, public.notifications to authenticated;
grant insert on public.community_feedback, public.analytics_events to authenticated;
grant insert on public.recommendation_logs to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy destinations_published_read on public.destinations for select to anon, authenticated using (status = 'published');
create policy experiences_published_read on public.experiences for select to anon, authenticated using (status = 'published' and is_verified and not is_paused);
create policy experiences_host_insert on public.experiences for insert to authenticated with check (host_id = (select auth.uid()) and public.current_app_role() = 'host');
create policy experiences_host_update on public.experiences for update to authenticated using (host_id = (select auth.uid()) and public.current_app_role() = 'host') with check (host_id = (select auth.uid()) and public.current_app_role() = 'host');
grant insert (host_id, destination_id, title, slug, short_description, description, cultural_context, price_jpy, duration_minutes, max_capacity, accessibility, languages, interests, rules, photography_policy, booking_policy, meeting_point, latitude, longitude, status, is_paused) on public.experiences to authenticated;
grant update (destination_id, title, slug, short_description, description, cultural_context, price_jpy, duration_minutes, max_capacity, accessibility, languages, interests, rules, photography_policy, booking_policy, meeting_point, latitude, longitude, status, is_paused) on public.experiences to authenticated;
create policy experiences_host_read on public.experiences for select to authenticated using (host_id = (select auth.uid()));
create policy slots_public_read on public.experience_slots for select to anon, authenticated using (
  exists (select 1 from public.experiences e where e.id = experience_id and e.status = 'published' and e.is_verified and not e.is_paused)
);
create policy slots_host_manage on public.experience_slots for all to authenticated using (
  exists (select 1 from public.experiences e where e.id = experience_id and e.host_id = (select auth.uid()))
) with check (
  exists (select 1 from public.experiences e where e.id = experience_id and e.host_id = (select auth.uid()) and public.current_app_role() = 'host')
);
grant insert (experience_id, starts_at, ends_at, capacity, status) on public.experience_slots to authenticated;
grant update (starts_at, ends_at, capacity, status) on public.experience_slots to authenticated;
revoke update (booked_count) on public.experience_slots from authenticated;
create policy bookings_traveler_read on public.bookings for select to authenticated using (traveler_id = (select auth.uid()));
create policy bookings_host_read on public.bookings for select to authenticated using (
  exists (select 1 from public.experiences e where e.id = experience_id and e.host_id = (select auth.uid()))
);
create policy itineraries_owner_all on public.itineraries for all to authenticated using (traveler_id = (select auth.uid())) with check (traveler_id = (select auth.uid()));
grant insert, update, delete on public.itineraries to authenticated;
create policy itinerary_items_owner_all on public.itinerary_items for all to authenticated using (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and i.traveler_id = (select auth.uid()))
) with check (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and i.traveler_id = (select auth.uid()))
);
grant insert, update, delete on public.itinerary_items to authenticated;
create policy cultural_sources_verified_read on public.cultural_sources for select to anon, authenticated using (status = 'verified' and (stale_after is null or stale_after > now()));
create policy cultural_content_verified_read on public.cultural_content for select to anon, authenticated using (
  status = 'verified' and (stale_after is null or stale_after > now()) and exists (
    select 1 from public.cultural_sources s where s.id = source_id and s.status = 'verified' and (s.stale_after is null or s.stale_after > now())
  )
);
create policy community_feedback_owner_insert on public.community_feedback for insert to authenticated with check (
  author_id = (select auth.uid()) and (host_id is null or (host_id = (select auth.uid()) and public.current_app_role() = 'host'))
);
create policy community_feedback_owner_read on public.community_feedback for select to authenticated using (author_id = (select auth.uid()));
create policy community_feedback_host_read on public.community_feedback for select to authenticated using (host_id = (select auth.uid()));
create policy traveler_feedback_owner_read on public.traveler_feedback for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = booking_id and b.traveler_id = (select auth.uid()))
);
create policy traveler_feedback_host_read on public.traveler_feedback for select to authenticated using (
  exists (select 1 from public.bookings b join public.experiences e on e.id = b.experience_id where b.id = booking_id and e.host_id = (select auth.uid()))
);
create policy traveler_feedback_owner_insert on public.traveler_feedback for insert to authenticated with check (
  exists (select 1 from public.bookings b where b.id = booking_id and b.traveler_id = (select auth.uid()) and b.status = 'completed')
);
grant insert on public.traveler_feedback to authenticated;
create policy passport_owner_read on public.passport_achievements for select to authenticated using (traveler_id = (select auth.uid()));
create policy analytics_owner_insert on public.analytics_events for insert to authenticated with check (user_id is null or user_id = (select auth.uid()));
create policy recommendation_owner_read on public.recommendation_logs for select to authenticated using (traveler_id = (select auth.uid()));
create policy recommendation_owner_insert on public.recommendation_logs for insert to authenticated with check (traveler_id = (select auth.uid()));
create policy notifications_owner_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_owner_update_read_at on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- DMO endpoint returns destination aggregates only and suppresses groups smaller than five.
create or replace function public.dmo_destination_metrics()
returns table (
  destination_id uuid,
  destination_name text,
  booking_count bigint,
  active_experience_count bigint,
  remaining_slot_capacity bigint,
  average_community_pressure numeric
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'dmo') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select d.id, d.name,
      (select count(*) from public.bookings b join public.experiences e on e.id = b.experience_id where e.destination_id = d.id and b.status in ('confirmed', 'completed')),
      (select count(*) from public.experiences e where e.destination_id = d.id and e.status = 'published'),
      (select coalesce(sum(greatest(s.capacity - s.booked_count, 0)), 0) from public.experience_slots s join public.experiences e on e.id = s.experience_id where e.destination_id = d.id and s.starts_at > now() and s.status = 'open'),
      (select avg(cf.pressure_score)::numeric from public.community_feedback cf where cf.destination_id = d.id and cf.created_at > now() - interval '90 days')
    from public.destinations d
    where d.status = 'published'
      and (select count(*) from public.bookings b join public.experiences e on e.id = b.experience_id where e.destination_id = d.id and b.status in ('confirmed', 'completed')) >= 5;
end;
$$;
revoke all on function public.dmo_destination_metrics() from public, anon;
grant execute on function public.dmo_destination_metrics() to authenticated;

comment on table public.destinations is 'Destination signal values require provenance; unknown values remain null and must not be presented as live.';
comment on table public.analytics_events is 'Minimize collection; never use precise movement history for general product analytics.';
comment on table public.recommendation_logs is 'Private traveler context; never exposed to DMO roles.';
