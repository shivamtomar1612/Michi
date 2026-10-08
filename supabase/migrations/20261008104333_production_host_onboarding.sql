-- Operator applications do not grant privileges or create host inventory.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
-- The existing Supabase-managed trigger was verified present and enabled.

-- This event trigger runs automatically for DDL and is not an API function.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Repair only real Auth users that are missing a profile; every role defaults to traveler.
insert into public.profiles (id, full_name)
select u.id, left(coalesce(u.raw_user_meta_data ->> 'full_name', ''), 120)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

create type public.host_application_status as enum
  ('draft', 'submitted', 'under_review', 'verified', 'rejected', 'suspended');

create table public.host_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete restrict,
  external_experience_id uuid references public.external_experiences(id) on delete set null,
  legal_name text not null,
  organization_name text not null,
  official_website text,
  contact_email text not null,
  ownership_evidence text not null default '',
  experience_description text not null default '',
  cultural_rules text not null default '',
  accessibility_details text not null default '',
  availability_plan text not null default '',
  capacity_plan text not null default '',
  cancellation_rules text not null default '',
  status public.host_application_status not null default 'draft',
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint host_application_website check (official_website is null or official_website ~ '^https://'),
  constraint host_application_email check (contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint host_application_submit_complete check (
    status = 'draft' or (
      submitted_at is not null
      and
      length(trim(legal_name)) > 1 and length(trim(organization_name)) > 1
      and length(trim(ownership_evidence)) > 10 and length(trim(experience_description)) > 10
      and length(trim(cultural_rules)) > 1 and length(trim(accessibility_details)) > 1
      and length(trim(availability_plan)) > 1 and length(trim(capacity_plan)) > 1
      and length(trim(cancellation_rules)) > 1
    )
  )
);
create index host_applications_applicant_idx on public.host_applications(applicant_id, created_at desc);
create index host_applications_review_idx on public.host_applications(status, submitted_at desc);
create unique index host_applications_one_active_idx on public.host_applications(applicant_id)
  where status in ('draft', 'submitted', 'under_review', 'verified');
create trigger host_applications_updated_at before update on public.host_applications
  for each row execute function public.set_updated_at();
alter table public.host_applications enable row level security;
grant select on public.host_applications to authenticated;
grant insert (applicant_id, external_experience_id, legal_name, organization_name, official_website,
  contact_email, ownership_evidence, experience_description, cultural_rules, accessibility_details,
  availability_plan, capacity_plan, cancellation_rules, status, submitted_at) on public.host_applications to authenticated;
grant update (legal_name, organization_name, official_website, contact_email, ownership_evidence,
  experience_description, cultural_rules, accessibility_details, availability_plan,
  capacity_plan, cancellation_rules, status, submitted_at, external_experience_id)
  on public.host_applications to authenticated;
grant all on public.host_applications to service_role;
create policy host_applications_owner_read on public.host_applications for select to authenticated
  using (applicant_id = (select auth.uid()));
create policy host_applications_admin_read on public.host_applications for select to authenticated
  using (public.current_app_role() = 'admin');
create policy host_applications_owner_create on public.host_applications for insert to authenticated
  with check (applicant_id = (select auth.uid()) and public.current_app_role() = 'traveler'
    and status in ('draft', 'submitted') and reviewer_id is null);
create policy host_applications_owner_draft_update on public.host_applications for update to authenticated
  using (applicant_id = (select auth.uid()) and status = 'draft')
  with check (applicant_id = (select auth.uid()) and status in ('draft', 'submitted') and reviewer_id is null);

-- This field can only be set by a privileged reviewer after operator authorization.
alter table public.experiences add column source_external_experience_id uuid
  references public.external_experiences(id) on delete set null;
create index experiences_external_source_idx on public.experiences(source_external_experience_id)
  where source_external_experience_id is not null;

create table public.host_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  external_experience_id uuid references public.external_experiences(id) on delete set null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'prepared' check (status in ('prepared', 'sent', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (email, external_experience_id)
);
create index host_invitations_status_idx on public.host_invitations(status, created_at desc);
alter table public.host_invitations enable row level security;
grant all on public.host_invitations to service_role;

-- Review is atomic: only an authenticated admin may grant host privileges.
create or replace function public.review_host_application(
  p_application_id uuid, p_status public.host_application_status, p_note text,
  p_ownership_checked boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare
  application public.host_applications%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('under_review', 'verified', 'rejected', 'suspended') then
    raise exception 'invalid review status' using errcode = '22023';
  end if;
  select * into application from public.host_applications where id = p_application_id for update;
  if not found then raise exception 'application not found' using errcode = 'P0002'; end if;
  if p_status = 'verified' and not p_ownership_checked then
    raise exception 'ownership verification required' using errcode = '22023';
  end if;
  if p_status = 'verified' and application.status not in ('submitted', 'under_review') then
    raise exception 'application must be submitted first' using errcode = '22023';
  end if;
  if p_status = 'under_review' and application.status <> 'submitted' then
    raise exception 'application must be submitted first' using errcode = '22023';
  end if;
  if p_status = 'rejected' and application.status not in ('submitted', 'under_review') then
    raise exception 'only an unapproved application can be rejected' using errcode = '22023';
  end if;
  if p_status = 'suspended' and application.status <> 'verified' then
    raise exception 'only a verified host can be suspended' using errcode = '22023';
  end if;
  update public.host_applications set status = p_status, review_note = left(p_note, 4000),
    reviewer_id = (select auth.uid()), reviewed_at = now() where id = p_application_id;
  if p_status = 'verified' then
    update public.profiles set role = 'host' where id = application.applicant_id and role = 'traveler';
  elsif p_status = 'suspended' then
    update public.experiences set is_paused = true where host_id = application.applicant_id;
  end if;
end;
$$;
revoke all on function public.review_host_application(uuid, public.host_application_status, text, boolean) from public, anon;
grant execute on function public.review_host_application(uuid, public.host_application_status, text, boolean) to authenticated;

create schema if not exists private;
create or replace function private.verified_host(p_host_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.host_applications a
    where a.applicant_id = p_host_id and a.status = 'verified')
$$;
revoke all on function private.verified_host(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.verified_host(uuid) to anon, authenticated;

drop policy experiences_published_read on public.experiences;
create policy experiences_published_read on public.experiences for select to anon, authenticated
  using (status = 'published' and is_verified and not is_paused and private.verified_host(host_id));
drop policy experiences_host_update on public.experiences;
create policy experiences_host_update on public.experiences for update to authenticated
  using (host_id = (select auth.uid()) and public.current_app_role() = 'host')
  with check (host_id = (select auth.uid()) and public.current_app_role() = 'host'
    and (is_paused or status <> 'published' or private.verified_host(host_id)));
drop policy slots_host_manage on public.experience_slots;
create policy slots_host_manage on public.experience_slots for all to authenticated using (
  exists (select 1 from public.experiences e where e.id = experience_id
    and e.host_id = (select auth.uid()) and private.verified_host(e.host_id))
) with check (
  exists (select 1 from public.experiences e where e.id = experience_id
    and e.host_id = (select auth.uid()) and public.current_app_role() = 'host'
    and private.verified_host(e.host_id))
);

-- Preserve old observations without pretending their provenance is newly retrieved.
alter table public.destination_health_signals
  add column retrieved_at timestamptz,
  add column data_status text not null default 'unavailable'
    check (data_status in ('observed_official', 'forecast_official', 'operator_provided',
      'community_reported', 'modeled_estimate', 'simulated_demo', 'unavailable')),
  add column metadata jsonb not null default '{}'::jsonb;
create index destination_health_status_expiry_idx
  on public.destination_health_signals(data_status, expires_at);
alter table public.destination_health_signals add constraint destination_health_status_truth_check check (
  (data_status in ('observed_official', 'forecast_official') and truth_category = 'official')
  or (data_status = 'operator_provided' and truth_category = 'host')
  or (data_status = 'community_reported' and truth_category = 'community')
  or (data_status = 'modeled_estimate' and truth_category in ('unverified', 'stale'))
  or (data_status = 'simulated_demo' and truth_category = 'simulated' and data_mode = 'simulated')
  or data_status = 'unavailable'
);
drop policy destination_health_public_verified_read on public.destination_health_signals;
create policy destination_health_public_verified_read
  on public.destination_health_signals for select to anon, authenticated
  using (
    verification_status = 'verified' and retrieved_at is not null
    and data_status in ('observed_official', 'forecast_official', 'operator_provided', 'community_reported')
    and verified_at is not null and expires_at > now()
    and exists (select 1 from public.destinations d where d.id = destination_id
      and d.status = 'published' and d.verification_status = 'verified_official'
      and d.data_status = 'official_tourism')
  );

-- Host inventory is only bookable after a real, reviewed operator application.
create unique index bookings_one_active_traveler_slot_idx on public.bookings(traveler_id, slot_id)
  where status in ('pending', 'confirmed');
create index analytics_events_user_id_idx on public.analytics_events(user_id);
create index bookings_slot_experience_idx on public.bookings(slot_id, experience_id);
create index community_feedback_author_id_idx on public.community_feedback(author_id);
create index external_experiences_place_id_idx on public.external_experiences(place_id);
create index itinerary_items_destination_id_idx on public.itinerary_items(destination_id);
create index itinerary_items_experience_id_idx on public.itinerary_items(experience_id);

create or replace function public.request_experience_booking(
  p_slot_id uuid, p_guests integer, p_rule_acknowledgment jsonb, p_notes text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  slot_row public.experience_slots%rowtype;
  experience_row public.experiences%rowtype;
  new_booking_id uuid;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'traveler'
  ) then raise exception 'traveler account required' using errcode = '42501'; end if;
  if p_guests is null or p_guests < 1 or p_guests > 100 or jsonb_typeof(p_rule_acknowledgment) is distinct from 'object'
     or p_rule_acknowledgment ->> 'acknowledged' is distinct from 'true'
     or p_notes is null or length(p_notes) > 2000 then
    raise exception 'invalid booking request' using errcode = '22023';
  end if;
  select * into slot_row from public.experience_slots where id = p_slot_id for update;
  if not found then raise exception 'slot not found' using errcode = 'P0002'; end if;
  select * into experience_row from public.experiences where id = slot_row.experience_id;
  if experience_row.status <> 'published' or not experience_row.is_verified or experience_row.is_paused
    or slot_row.status <> 'open' or slot_row.starts_at <= now()
    or slot_row.booked_count + p_guests > slot_row.capacity
    or not exists (select 1 from public.host_applications a
      where a.applicant_id = experience_row.host_id and a.status = 'verified') then
    raise exception 'experience is not bookable for this slot' using errcode = '22023';
  end if;
  if experience_row.price_jpy::numeric * p_guests > 2147483647 then
    raise exception 'booking total exceeds supported range' using errcode = '22003';
  end if;
  insert into public.bookings (traveler_id, experience_id, slot_id, guests, total_price_jpy,
    status, rule_acknowledgment, notes)
  values ((select auth.uid()), experience_row.id, slot_row.id, p_guests,
    experience_row.price_jpy * p_guests, 'pending', p_rule_acknowledgment, p_notes)
  returning id into new_booking_id;
  update public.experience_slots set booked_count = booked_count + p_guests,
    status = case when booked_count + p_guests = capacity then 'full'::public.slot_status else status end
  where id = slot_row.id;
  return new_booking_id;
end;
$$;
revoke all on function public.request_experience_booking(uuid, integer, jsonb, text) from public, anon;
grant execute on function public.request_experience_booking(uuid, integer, jsonb, text) to authenticated;

create or replace function public.confirm_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
begin
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if booking_row.status <> 'pending' or not exists (
    select 1 from public.experiences e where e.id = booking_row.experience_id
      and e.host_id = (select auth.uid()) and exists (
        select 1 from public.host_applications a where a.applicant_id = e.host_id and a.status = 'verified'
      )
  ) then raise exception 'forbidden or booking unavailable' using errcode = '42501'; end if;
  update public.bookings set status = 'confirmed' where id = p_booking_id;
end;
$$;
revoke all on function public.confirm_experience_booking(uuid) from public, anon;
grant execute on function public.confirm_experience_booking(uuid) to authenticated;

create or replace function public.approve_host_experience(p_experience_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  experience_row public.experiences%rowtype;
  linked_listing_id uuid;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into experience_row from public.experiences where id = p_experience_id for update;
  if not found then raise exception 'experience not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.host_applications a
    where a.applicant_id = experience_row.host_id and a.status = 'verified')
    or length(trim(experience_row.cultural_context)) < 10
    or length(trim(experience_row.meeting_point)) < 3 then
    raise exception 'host or experience needs review' using errcode = '22023';
  end if;
  select a.external_experience_id into linked_listing_id from public.host_applications a
    where a.applicant_id = experience_row.host_id and a.status = 'verified'
    and a.external_experience_id is not null order by a.reviewed_at desc limit 1;
  if linked_listing_id is not null and not exists (
    select 1 from public.external_experiences x where x.id = linked_listing_id
      and x.destination_id = experience_row.destination_id
      and x.verification_status in ('verified_primary', 'verified_official')
  ) then raise exception 'linked external listing does not match this destination' using errcode = '22023'; end if;
  update public.experiences set is_verified = true, status = 'published', is_paused = false
    , source_external_experience_id = linked_listing_id
  where id = p_experience_id;
end;
$$;
revoke all on function public.approve_host_experience(uuid) from public, anon;
grant execute on function public.approve_host_experience(uuid) to authenticated;
