-- Phase 11: transactional booking lifecycle and private in-app notifications.
alter table public.bookings
  add column if not exists cultural_requirements jsonb not null default '{}'::jsonb;

create index if not exists notifications_unread_owner_idx
  on public.notifications (user_id, created_at desc) where read_at is null;

create unique index if not exists notifications_preparation_booking_unique_idx
  on public.notifications (user_id, (metadata ->> 'booking_id'))
  where type = 'cultural_preparation_reminder' and metadata ? 'booking_id';

create or replace function private.notify_booking_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  host_user_id uuid;
  experience_title text;
  slot_start timestamptz;
  actor text;
begin
  select e.host_id, e.title, s.starts_at
    into host_user_id, experience_title, slot_start
  from public.experiences e
  join public.experience_slots s on s.experience_id = e.id
  where e.id = new.experience_id and s.id = new.slot_id;

  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, type, title, body, link, metadata)
    values (host_user_id, 'booking_request', 'New booking request',
      'A traveler requested ' || experience_title || '.', '/host/bookings',
      jsonb_build_object('booking_id', new.id, 'experience_id', new.experience_id));
    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'confirmed' and old.status = 'pending' then
      insert into public.notifications(user_id, type, title, body, link, metadata)
      values (new.traveler_id, 'booking_confirmation', 'Booking confirmed',
        'Your request for ' || experience_title || ' is confirmed.', '/traveler/bookings',
        jsonb_build_object('booking_id', new.id, 'experience_id', new.experience_id));
    elsif new.status = 'cancelled' and old.status in ('pending', 'confirmed') then
      actor := coalesce(current_setting('michi.booking_actor', true), 'host');
      if actor = 'traveler' then
        insert into public.notifications(user_id, type, title, body, link, metadata)
        values (host_user_id, 'booking_cancellation', 'Booking cancelled',
          'A traveler cancelled a booking for ' || experience_title || '.', '/host/bookings',
          jsonb_build_object('booking_id', new.id, 'experience_id', new.experience_id));
      else
        insert into public.notifications(user_id, type, title, body, link, metadata)
        values (new.traveler_id, 'host_cancellation', 'Booking cancelled by host',
          'The host cancelled your booking for ' || experience_title || '.', '/traveler/bookings',
          jsonb_build_object('booking_id', new.id, 'experience_id', new.experience_id));
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_booking_event() from public, anon, authenticated;

drop trigger if exists bookings_notify_event on public.bookings;
create trigger bookings_notify_event
after insert or update of status on public.bookings
for each row execute function private.notify_booking_event();

create or replace function private.notify_experience_modification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.title, old.description, old.cultural_context, old.price_jpy,
      old.duration_minutes, old.rules, old.accessibility, old.booking_policy,
      old.photography_policy, old.meeting_point)
     is distinct from
     (new.title, new.description, new.cultural_context, new.price_jpy,
      new.duration_minutes, new.rules, new.accessibility, new.booking_policy,
      new.photography_policy, new.meeting_point) then
    insert into public.notifications(user_id, type, title, body, link, metadata)
    select distinct b.traveler_id, 'experience_modified', 'Experience details updated',
      'The host updated details for ' || new.title || '.', '/traveler/bookings',
      jsonb_build_object('booking_id', b.id, 'experience_id', new.id)
    from public.bookings b
    join public.experience_slots s on s.id = b.slot_id
    where b.experience_id = new.id and b.status in ('pending', 'confirmed')
      and s.starts_at > now();
  end if;
  return new;
end;
$$;
revoke all on function private.notify_experience_modification() from public, anon, authenticated;

drop trigger if exists experiences_notify_booked_travelers on public.experiences;
create trigger experiences_notify_booked_travelers
after update of title, description, cultural_context, price_jpy, duration_minutes,
  rules, accessibility, booking_policy, photography_policy, meeting_point
on public.experiences
for each row execute function private.notify_experience_modification();

create or replace function private.notify_slot_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  experience_title text;
  message text;
begin
  if old.starts_at is not distinct from new.starts_at
     and old.ends_at is not distinct from new.ends_at
     and (old.status is not distinct from new.status
       or new.status not in ('closed', 'cancelled')) then
    return new;
  end if;
  select title into experience_title from public.experiences where id = new.experience_id;
  message := case when new.status in ('closed', 'cancelled')
    then 'The host changed the status of a slot for ' || experience_title || '. Your existing booking remains listed.'
    else 'The host changed the scheduled time for ' || experience_title || '. Review your booking details.' end;
  insert into public.notifications(user_id, type, title, body, link, metadata)
  select b.traveler_id, 'slot_change', 'Booking slot updated', message,
    '/traveler/bookings', jsonb_build_object('booking_id', b.id, 'experience_id', new.experience_id)
  from public.bookings b
  where b.slot_id = new.id and b.status in ('pending', 'confirmed');
  return new;
end;
$$;
revoke all on function private.notify_slot_change() from public, anon, authenticated;

drop trigger if exists experience_slots_notify_booked_travelers on public.experience_slots;
create trigger experience_slots_notify_booked_travelers
after update of starts_at, ends_at, status on public.experience_slots
for each row execute function private.notify_slot_change();

drop function if exists public.request_experience_booking(uuid, integer, jsonb, text);
create function public.request_experience_booking(
  p_slot_id uuid,
  p_guests integer,
  p_rule_acknowledgment jsonb,
  p_notes text default '',
  p_cultural_requirements jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot_row public.experience_slots%rowtype;
  experience_row public.experiences%rowtype;
  new_booking_id uuid;
  rule_snapshot jsonb;
  requirement_key text;
  requirement_value text;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'traveler'
  ) then raise exception 'traveler account required' using errcode = '42501'; end if;
  if p_guests is null or p_guests < 1 or p_guests > 100
     or jsonb_typeof(p_rule_acknowledgment) is distinct from 'object'
     or p_rule_acknowledgment ->> 'acknowledged' is distinct from 'true'
     or jsonb_typeof(coalesce(p_cultural_requirements, '{}'::jsonb)) is distinct from 'object'
     or p_notes is null or length(p_notes) > 2000 then
    raise exception 'invalid booking request' using errcode = '22023';
  end if;
  for requirement_key, requirement_value in
    select key, value from jsonb_each_text(coalesce(p_cultural_requirements, '{}'::jsonb))
  loop
    if requirement_key not in ('dietary', 'accessibility', 'language', 'participation', 'other')
       or length(requirement_value) > 250 then
      raise exception 'invalid cultural requirements' using errcode = '22023';
    end if;
  end loop;

  select * into slot_row from public.experience_slots where id = p_slot_id for update;
  if not found then raise exception 'slot not found' using errcode = 'P0002'; end if;
  select * into experience_row from public.experiences where id = slot_row.experience_id;
  if not found or experience_row.status <> 'published' or not experience_row.is_verified
    or experience_row.is_paused or slot_row.status <> 'open'
    or slot_row.starts_at <= now() or slot_row.ends_at <= slot_row.starts_at
    or slot_row.booked_count + p_guests > slot_row.capacity
    or not exists (select 1 from public.host_applications a
      where a.applicant_id = experience_row.host_id and a.status = 'verified') then
    raise exception 'experience is not bookable for this slot' using errcode = '22023';
  end if;
  if experience_row.price_jpy::numeric * p_guests > 2147483647 then
    raise exception 'booking total exceeds supported range' using errcode = '22003';
  end if;
  rule_snapshot := jsonb_build_object(
    'photography_policy', experience_row.photography_policy,
    'participation_rules', experience_row.rules -> 'participation_rules',
    'etiquette_rules', experience_row.rules -> 'etiquette_rules',
    'eligibility', experience_row.rules -> 'eligibility',
    'cancellation_rules', experience_row.booking_policy -> 'cancellation_rules',
    'accessibility', experience_row.accessibility,
    'meeting_point', experience_row.meeting_point
  );
  insert into public.bookings (traveler_id, experience_id, slot_id, guests,
    total_price_jpy, status, rule_acknowledgment, cultural_requirements, notes)
  values ((select auth.uid()), experience_row.id, slot_row.id, p_guests,
    experience_row.price_jpy * p_guests, 'pending',
    jsonb_build_object('acknowledged', true, 'acknowledged_at', clock_timestamp(),
      'rules_digest', md5(rule_snapshot::text), 'rules_snapshot', rule_snapshot),
    coalesce(p_cultural_requirements, '{}'::jsonb), p_notes)
  returning id into new_booking_id;
  update public.experience_slots set booked_count = booked_count + p_guests,
    status = case when booked_count + p_guests = capacity then 'full'::public.slot_status else status end
  where id = slot_row.id;
  return new_booking_id;
end;
$$;
revoke all on function public.request_experience_booking(uuid, integer, jsonb, text, jsonb) from public, anon;
grant execute on function public.request_experience_booking(uuid, integer, jsonb, text, jsonb) to authenticated;

create or replace function public.decline_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  slot_row public.experience_slots%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'host'
  ) then raise exception 'host account required' using errcode = '42501'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if booking_row.status <> 'pending' or not exists (
    select 1 from public.experiences e join public.host_applications a on a.applicant_id = e.host_id
    where e.id = booking_row.experience_id and e.host_id = (select auth.uid()) and a.status = 'verified'
  ) then raise exception 'forbidden or booking unavailable' using errcode = '42501'; end if;
  select * into slot_row from public.experience_slots where id = booking_row.slot_id for update;
  if not found or slot_row.booked_count < booking_row.guests then raise exception 'slot reservation is inconsistent' using errcode = '22023'; end if;
  perform set_config('michi.booking_actor', 'host', true);
  update public.bookings set status = 'cancelled' where id = p_booking_id;
  update public.experience_slots set booked_count = booked_count - booking_row.guests,
    status = case when status = 'full' and starts_at > now()
      and booked_count - booking_row.guests < capacity then 'open'::public.slot_status else status end
  where id = slot_row.id;
end;
$$;
revoke all on function public.decline_experience_booking(uuid) from public, anon;
grant execute on function public.decline_experience_booking(uuid) to authenticated;

create function public.cancel_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  slot_row public.experience_slots%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'traveler'
  ) then raise exception 'traveler account required' using errcode = '42501'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or booking_row.traveler_id <> (select auth.uid()) then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if booking_row.status not in ('pending', 'confirmed') then raise exception 'booking can no longer be cancelled' using errcode = '22023'; end if;
  select * into slot_row from public.experience_slots where id = booking_row.slot_id for update;
  if not found or slot_row.booked_count < booking_row.guests then raise exception 'slot reservation is inconsistent' using errcode = '22023'; end if;
  if slot_row.starts_at <= now() then raise exception 'past bookings cannot be cancelled online' using errcode = '22023'; end if;
  perform set_config('michi.booking_actor', 'traveler', true);
  update public.bookings set status = 'cancelled' where id = p_booking_id;
  update public.experience_slots set booked_count = booked_count - booking_row.guests,
    status = case when status = 'full' and starts_at > now()
      and booked_count - booking_row.guests < capacity then 'open'::public.slot_status else status end
  where id = slot_row.id;
end;
$$;
revoke all on function public.cancel_experience_booking(uuid) from public, anon;
grant execute on function public.cancel_experience_booking(uuid) to authenticated;

create function public.cancel_host_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  slot_row public.experience_slots%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'host'
  ) then raise exception 'host account required' using errcode = '42501'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if booking_row.status not in ('pending', 'confirmed') or not exists (
    select 1 from public.experiences e join public.host_applications a on a.applicant_id = e.host_id
    where e.id = booking_row.experience_id and e.host_id = (select auth.uid()) and a.status = 'verified'
  ) then raise exception 'forbidden or booking unavailable' using errcode = '42501'; end if;
  select * into slot_row from public.experience_slots where id = booking_row.slot_id for update;
  if not found or slot_row.booked_count < booking_row.guests then raise exception 'slot reservation is inconsistent' using errcode = '22023'; end if;
  if slot_row.starts_at <= now() then raise exception 'past bookings cannot be cancelled online' using errcode = '22023'; end if;
  perform set_config('michi.booking_actor', 'host', true);
  update public.bookings set status = 'cancelled' where id = p_booking_id;
  update public.experience_slots set booked_count = booked_count - booking_row.guests,
    status = case when status = 'full' and starts_at > now()
      and booked_count - booking_row.guests < capacity then 'open'::public.slot_status else status end
  where id = slot_row.id;
end;
$$;
revoke all on function public.cancel_host_experience_booking(uuid) from public, anon;
grant execute on function public.cancel_host_experience_booking(uuid) to authenticated;

create function public.complete_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  slot_start timestamptz;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'host'
  ) then raise exception 'host account required' using errcode = '42501'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or booking_row.status <> 'confirmed' or not exists (
    select 1 from public.experiences e join public.host_applications a on a.applicant_id = e.host_id
    where e.id = booking_row.experience_id and e.host_id = (select auth.uid()) and a.status = 'verified'
  ) then raise exception 'forbidden or booking unavailable' using errcode = '42501'; end if;
  select starts_at into slot_start from public.experience_slots where id = booking_row.slot_id;
  if slot_start is null or slot_start > now() then raise exception 'visit has not started' using errcode = '22023'; end if;
  update public.bookings set status = 'completed' where id = p_booking_id;
end;
$$;
revoke all on function public.complete_experience_booking(uuid) from public, anon;
grant execute on function public.complete_experience_booking(uuid) to authenticated;

create function public.enqueue_booking_preparation_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  queued integer;
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  insert into public.notifications(user_id, type, title, body, link, metadata)
  select b.traveler_id, 'cultural_preparation_reminder', 'Prepare for your cultural experience',
    'Review the host-provided participation, access, and photography guidance before your visit.',
    '/traveler/bookings', jsonb_build_object('booking_id', b.id, 'experience_id', e.id)
  from public.bookings b
  join public.experiences e on e.id = b.experience_id
  join public.experience_slots s on s.id = b.slot_id
  where b.status = 'confirmed' and s.starts_at > now() and s.starts_at <= now() + interval '48 hours'
  on conflict do nothing;
  get diagnostics queued = row_count;
  return queued;
end;
$$;
revoke all on function public.enqueue_booking_preparation_reminders() from public, anon, authenticated;
grant execute on function public.enqueue_booking_preparation_reminders() to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
