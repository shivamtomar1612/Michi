-- Private traveler reflection and deterministic Cultural Passport awards.
alter table public.traveler_feedback
  add column cultural_preparation_completed boolean not null default false,
  alter column preparation_helpfulness drop not null;

create table public.traveler_reflections (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  reflection text not null check (char_length(btrim(reflection)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index traveler_reflections_owner_recent_idx
  on public.traveler_reflections(traveler_id, created_at desc);

alter table public.traveler_reflections enable row level security;
revoke all on public.traveler_reflections from anon, authenticated;
grant select on public.traveler_reflections to authenticated;
grant all privileges on public.traveler_reflections to service_role;
create policy traveler_reflections_owner_read on public.traveler_reflections
  for select to authenticated using (traveler_id = (select auth.uid()));

create or replace function private.award_passport_achievements(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  preparation_done boolean := false;
  reflection_done boolean := false;
  verified_local_host boolean := false;
  acknowledged boolean := false;
  lower_pressure_alternative boolean := false;
begin
  select * into booking_row from public.bookings where id = p_booking_id;
  if not found or booking_row.status <> 'completed' then return; end if;
  acknowledged := booking_row.rule_acknowledgment ->> 'acknowledged' = 'true';
  select coalesce(f.cultural_preparation_completed, false) into preparation_done
    from public.traveler_feedback f where f.booking_id = p_booking_id;
  select exists (select 1 from public.traveler_reflections r where r.booking_id = p_booking_id)
    into reflection_done;
  select exists (
    select 1 from public.experiences e
    join public.host_applications a on a.applicant_id = e.host_id and a.status = 'verified'
    where e.id = booking_row.experience_id
  ) into verified_local_host;

  if acknowledged then
    insert into public.passport_achievements(traveler_id, type, title, description, metadata)
    values (booking_row.traveler_id, 'responsible_traveler', 'Responsible Traveler',
      'Completed a MICHI host experience after acknowledging its participation and visit rules.', jsonb_build_object('booking_id', p_booking_id))
    on conflict (traveler_id, type) do nothing;
  end if;
  if verified_local_host then
    insert into public.passport_achievements(traveler_id, type, title, description, metadata)
    values (booking_row.traveler_id, 'local_supporter', 'Local Supporter',
      'Completed an experience with a verified participating local host.', jsonb_build_object('booking_id', p_booking_id))
    on conflict (traveler_id, type) do nothing;
  end if;
  if preparation_done and acknowledged then
    insert into public.passport_achievements(traveler_id, type, title, description, metadata)
    values (booking_row.traveler_id, 'respectful_explorer', 'Respectful Explorer',
      'Completed cultural preparation and followed the host’s visit guidance.', jsonb_build_object('booking_id', p_booking_id))
    on conflict (traveler_id, type) do nothing;
  end if;
  if reflection_done then
    insert into public.passport_achievements(traveler_id, type, title, description, metadata)
    values (booking_row.traveler_id, 'cultural_learner', 'Cultural Learner',
      'Completed a private reflection after a cultural experience.', jsonb_build_object('booking_id', p_booking_id))
    on conflict (traveler_id, type) do nothing;
  end if;

  select exists (
    select 1
    from public.experiences e
    join public.destination_health_signals s on s.destination_id = e.destination_id
    join public.destinations d on d.id = e.destination_id
    join public.itinerary_decisions i on i.experience_id = e.id
      and i.traveler_id = booking_row.traveler_id
      and i.decision = 'accepted' and i.suggestion_origin = 'michi_alternative'
    where e.id = booking_row.experience_id
      and nullif(btrim(d.region), '') is not null
      and s.component_key = 'crowdPressure' and s.value <= 40
      and s.verification_status = 'verified' and s.verified_at is not null
      and s.observed_at <= booking_row.updated_at
      and s.expires_at > booking_row.updated_at
      and s.data_status in ('observed_official', 'forecast_official', 'operator_provided', 'community_reported')
  ) into lower_pressure_alternative;
  if lower_pressure_alternative then
    insert into public.passport_achievements(traveler_id, type, title, description, metadata)
    values (booking_row.traveler_id, 'regional_explorer', 'Regional Explorer',
      'Completed an accepted regional alternative with fresh, verified lower-pressure evidence.', jsonb_build_object('booking_id', p_booking_id))
    on conflict (traveler_id, type) do nothing;
  end if;
end;
$$;
revoke all on function private.award_passport_achievements(uuid) from public, anon, authenticated;

create or replace function private.refresh_passport_achievement_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'bookings' then
    perform private.award_passport_achievements(new.id);
  else
    perform private.award_passport_achievements(new.booking_id);
  end if;
  return new;
end;
$$;
revoke all on function private.refresh_passport_achievement_trigger() from public, anon, authenticated;

create trigger bookings_passport_achievements
after update of status on public.bookings
for each row when (new.status = 'completed' and old.status is distinct from new.status)
execute function private.refresh_passport_achievement_trigger();
create trigger feedback_passport_achievements
after insert on public.traveler_feedback
for each row execute function private.refresh_passport_achievement_trigger();
create trigger reflections_passport_achievements
after insert on public.traveler_reflections
for each row execute function private.refresh_passport_achievement_trigger();

create or replace function private.submit_experience_reflection(
  p_booking_id uuid,
  p_learning_reflection text,
  p_cultural_preparation_completed boolean,
  p_preparation_helpfulness smallint,
  p_understanding_score smallint,
  p_host_rating smallint,
  p_cultural_depth_score smallint
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'traveler'
  ) then raise exception 'traveler account required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_learning_reflection, ''))) not between 10 and 2000
     or p_understanding_score not between 1 and 5
     or p_host_rating not between 1 and 5
     or p_cultural_depth_score not between 1 and 5
     or p_cultural_preparation_completed is null
     or (p_cultural_preparation_completed and (p_preparation_helpfulness is null or p_preparation_helpfulness not between 1 and 5))
     or (not p_cultural_preparation_completed and p_preparation_helpfulness is not null) then
    raise exception 'reflection details are invalid' using errcode = '22023';
  end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or booking_row.traveler_id <> (select auth.uid()) then
    raise exception 'booking not found' using errcode = '42501';
  end if;
  if booking_row.status <> 'completed' then
    raise exception 'only completed experiences can be reflected on' using errcode = '22023';
  end if;
  insert into public.traveler_feedback(
    booking_id, cultural_depth_score, host_rating, understanding_score,
    preparation_helpfulness, cultural_preparation_completed, comment
  ) values (
    p_booking_id, p_cultural_depth_score, p_host_rating, p_understanding_score,
    p_preparation_helpfulness, p_cultural_preparation_completed, ''
  );
  insert into public.traveler_reflections(booking_id, traveler_id, reflection)
  values (p_booking_id, booking_row.traveler_id, btrim(p_learning_reflection));
  perform private.award_passport_achievements(p_booking_id);
end;
$$;
revoke all on function private.submit_experience_reflection(uuid,text,boolean,smallint,smallint,smallint,smallint) from public, anon, authenticated;

create or replace function public.submit_experience_reflection(
  p_booking_id uuid,
  p_learning_reflection text,
  p_cultural_preparation_completed boolean,
  p_preparation_helpfulness smallint,
  p_understanding_score smallint,
  p_host_rating smallint,
  p_cultural_depth_score smallint
)
returns void language sql security invoker set search_path = '' as $$
  select private.submit_experience_reflection(
    p_booking_id, p_learning_reflection, p_cultural_preparation_completed,
    p_preparation_helpfulness, p_understanding_score, p_host_rating, p_cultural_depth_score
  );
$$;
revoke all on function public.submit_experience_reflection(uuid,text,boolean,smallint,smallint,smallint,smallint) from public, anon;
grant execute on function public.submit_experience_reflection(uuid,text,boolean,smallint,smallint,smallint,smallint) to authenticated;
grant execute on function private.submit_experience_reflection(uuid,text,boolean,smallint,smallint,smallint,smallint) to authenticated;
revoke insert on public.traveler_feedback from authenticated;

create or replace function private.get_cultural_passport_metrics(p_traveler_id uuid)
returns table (
  experiences_completed bigint,
  regions_explored bigint,
  local_experiences_supported bigint,
  cultural_preparation_completed bigint,
  responsible_alternatives_selected bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_traveler_id
     or not exists (select 1 from public.profiles p where p.id = p_traveler_id and p.role = 'traveler') then
    raise exception 'traveler account required' using errcode = '42501';
  end if;
  return query
    select
      (select count(*) from public.bookings b where b.traveler_id = p_traveler_id and b.status = 'completed'),
      (select count(distinct d.region) from public.bookings b join public.experiences e on e.id = b.experience_id
        join public.destinations d on d.id = e.destination_id where b.traveler_id = p_traveler_id and b.status = 'completed'),
      (select count(distinct b.experience_id) from public.bookings b join public.experiences e on e.id = b.experience_id
        join public.host_applications a on a.applicant_id = e.host_id and a.status = 'verified'
        where b.traveler_id = p_traveler_id and b.status = 'completed'),
      (select count(distinct f.booking_id) from public.traveler_feedback f join public.bookings b on b.id = f.booking_id
        where b.traveler_id = p_traveler_id and b.status = 'completed' and f.cultural_preparation_completed),
      (select count(distinct i.id) from public.itinerary_decisions i
        where i.traveler_id = p_traveler_id and i.decision = 'accepted' and i.suggestion_origin = 'michi_alternative');
end;
$$;
revoke all on function private.get_cultural_passport_metrics(uuid) from public, anon, authenticated;
grant execute on function private.get_cultural_passport_metrics(uuid) to authenticated;

create or replace function public.get_cultural_passport_metrics()
returns table (
  experiences_completed bigint,
  regions_explored bigint,
  local_experiences_supported bigint,
  cultural_preparation_completed bigint,
  responsible_alternatives_selected bigint
)
language sql stable security invoker set search_path = '' as $$
  select * from private.get_cultural_passport_metrics((select auth.uid()));
$$;
revoke all on function public.get_cultural_passport_metrics() from public, anon;
grant execute on function public.get_cultural_passport_metrics() to authenticated;
