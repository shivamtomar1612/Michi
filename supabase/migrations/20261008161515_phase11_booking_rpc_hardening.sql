-- Exposed PostgREST functions are invoker wrappers; privileged row-locking
-- implementations live in the non-exposed private schema.
grant usage on schema private to authenticated;

create or replace function private.request_experience_booking(
  p_slot_id uuid,
  p_guests integer,
  p_rule_acknowledgment jsonb,
  p_notes text default '',
  p_cultural_requirements jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
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
revoke all on function private.request_experience_booking(uuid,integer,jsonb,text,jsonb) from public, anon;
grant execute on function private.request_experience_booking(uuid,integer,jsonb,text,jsonb) to authenticated;

create or replace function public.request_experience_booking(
  p_slot_id uuid, p_guests integer, p_rule_acknowledgment jsonb,
  p_notes text default '', p_cultural_requirements jsonb default '{}'::jsonb
) returns uuid language sql security invoker set search_path = '' as $$
  select private.request_experience_booking(p_slot_id,p_guests,p_rule_acknowledgment,p_notes,p_cultural_requirements);
$$;
revoke all on function public.request_experience_booking(uuid,integer,jsonb,text,jsonb) from public, anon;
grant execute on function public.request_experience_booking(uuid,integer,jsonb,text,jsonb) to authenticated;

create or replace function private.confirm_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'host'
  ) then raise exception 'host account required' using errcode = '42501'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or booking_row.status <> 'pending' or not exists (
    select 1 from public.experiences e join public.host_applications a on a.applicant_id = e.host_id
    where e.id = booking_row.experience_id and e.host_id = (select auth.uid()) and a.status = 'verified'
  ) then raise exception 'forbidden or booking unavailable' using errcode = '42501'; end if;
  update public.bookings set status = 'confirmed' where id = p_booking_id;
end;
$$;
revoke all on function private.confirm_experience_booking(uuid) from public, anon;
grant execute on function private.confirm_experience_booking(uuid) to authenticated;

create or replace function public.confirm_experience_booking(p_booking_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.confirm_experience_booking(p_booking_id);
$$;
revoke all on function public.confirm_experience_booking(uuid) from public, anon;
grant execute on function public.confirm_experience_booking(uuid) to authenticated;

create or replace function private.decline_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; slot_row public.experience_slots%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'host'
  ) then raise exception 'host account required' using errcode = '42501'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or booking_row.status <> 'pending' or not exists (
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
revoke all on function private.decline_experience_booking(uuid) from public, anon;
grant execute on function private.decline_experience_booking(uuid) to authenticated;

create or replace function public.decline_experience_booking(p_booking_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.decline_experience_booking(p_booking_id);
$$;
revoke all on function public.decline_experience_booking(uuid) from public, anon;
grant execute on function public.decline_experience_booking(uuid) to authenticated;

create or replace function private.cancel_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; slot_row public.experience_slots%rowtype;
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
revoke all on function private.cancel_experience_booking(uuid) from public, anon;
grant execute on function private.cancel_experience_booking(uuid) to authenticated;

create or replace function public.cancel_experience_booking(p_booking_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.cancel_experience_booking(p_booking_id);
$$;
revoke all on function public.cancel_experience_booking(uuid) from public, anon;
grant execute on function public.cancel_experience_booking(uuid) to authenticated;

create or replace function private.cancel_host_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; slot_row public.experience_slots%rowtype;
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
revoke all on function private.cancel_host_experience_booking(uuid) from public, anon;
grant execute on function private.cancel_host_experience_booking(uuid) to authenticated;

create or replace function public.cancel_host_experience_booking(p_booking_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.cancel_host_experience_booking(p_booking_id);
$$;
revoke all on function public.cancel_host_experience_booking(uuid) from public, anon;
grant execute on function public.cancel_host_experience_booking(uuid) to authenticated;

create or replace function private.complete_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; slot_start timestamptz;
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
revoke all on function private.complete_experience_booking(uuid) from public, anon;
grant execute on function private.complete_experience_booking(uuid) to authenticated;

create or replace function public.complete_experience_booking(p_booking_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.complete_experience_booking(p_booking_id);
$$;
revoke all on function public.complete_experience_booking(uuid) from public, anon;
grant execute on function public.complete_experience_booking(uuid) to authenticated;
