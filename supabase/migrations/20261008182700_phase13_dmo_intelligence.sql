-- Phase 13: destination-scoped, privacy-preserving DMO analytics and governed feedback.
-- No operational or simulated rows are seeded by this migration.

create table public.destination_access_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  destination_id uuid not null references public.destinations(id) on delete cascade,
  access_scope text not null check (access_scope in ('dmo_analytics', 'community_representative')),
  granted_by uuid not null references public.profiles(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint destination_access_revocation_check check (revoked_at is null or revoked_at >= granted_at)
);

create unique index destination_access_active_unique_idx
  on public.destination_access_assignments(user_id, destination_id, access_scope)
  where revoked_at is null;
create index destination_access_user_scope_idx
  on public.destination_access_assignments(user_id, access_scope, destination_id)
  where revoked_at is null;

alter table public.destination_access_assignments enable row level security;
revoke all on public.destination_access_assignments from public, anon, authenticated;
grant select on public.destination_access_assignments to authenticated;
grant all privileges on public.destination_access_assignments to service_role;
create policy destination_access_read_own on public.destination_access_assignments
  for select to authenticated using ((select auth.uid()) = user_id and revoked_at is null);

comment on table public.destination_access_assignments is
  'Admin-granted, destination-scoped access. App roles alone do not confer destination scope.';

alter table public.community_feedback
  add column feedback_category text not null default 'community_readiness'
    check (feedback_category in ('visitor_pressure', 'cultural_respect', 'operational_strain', 'local_economic_benefit', 'community_readiness', 'environmental_concern')),
  add column contributor_context text not null default 'host'
    check (contributor_context in ('host', 'community_representative')),
  add column consent_to_aggregate boolean not null default false,
  add column consent_given_at timestamptz,
  add column moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'withdrawn')),
  add column withdrawn_at timestamptz,
  add column submitted_on date not null default current_date,
  add constraint community_feedback_consent_timestamp_check
    check (not consent_to_aggregate or consent_given_at is not null),
  add constraint community_feedback_withdrawal_check
    check ((moderation_status = 'withdrawn') = (withdrawn_at is not null));

create unique index community_feedback_daily_contributor_idx
  on public.community_feedback(destination_id, author_id, feedback_category, submitted_on)
  where author_id is not null;
create index community_feedback_aggregate_idx
  on public.community_feedback(destination_id, created_at, moderation_status, feedback_category)
  where consent_to_aggregate and moderation_status = 'approved' and withdrawn_at is null;

drop policy if exists community_feedback_owner_insert on public.community_feedback;
drop policy if exists community_feedback_owner_read on public.community_feedback;
drop policy if exists community_feedback_host_read on public.community_feedback;
create policy community_feedback_submit_authorized on public.community_feedback
  for insert to authenticated with check (
    author_id = (select auth.uid())
    and consent_to_aggregate
    and consent_given_at is not null
    and moderation_status = 'pending'
    and withdrawn_at is null
    and submitted_on = current_date
    and (
      (contributor_context = 'host'
        and host_id = (select auth.uid())
        and public.current_app_role() = 'host'
        and exists (
          select 1 from public.experiences e
          where e.host_id = (select auth.uid()) and e.destination_id = community_feedback.destination_id
        ))
      or
      (contributor_context = 'community_representative'
        and host_id is null
        and exists (
          select 1 from public.destination_access_assignments a
          where a.user_id = (select auth.uid())
            and a.destination_id = community_feedback.destination_id
            and a.access_scope = 'community_representative'
            and a.revoked_at is null
        ))
    )
  );
create policy community_feedback_author_read on public.community_feedback
  for select to authenticated using (author_id = (select auth.uid()));
create policy community_feedback_author_withdraw on public.community_feedback
  for update to authenticated using (
    author_id = (select auth.uid()) and withdrawn_at is null and moderation_status <> 'withdrawn'
  ) with check (
    author_id = (select auth.uid()) and withdrawn_at is not null and moderation_status = 'withdrawn'
  );

revoke insert, update, delete on public.community_feedback from authenticated;
grant insert (destination_id, host_id, author_id, sentiment, pressure_score, comment,
  feedback_category, contributor_context, consent_to_aggregate, consent_given_at)
  on public.community_feedback to authenticated;
grant update (moderation_status, withdrawn_at) on public.community_feedback to authenticated;

comment on column public.community_feedback.moderation_status is
  'Only approved, consented, non-withdrawn feedback contributes to DMO aggregates; narrative remains private.';
comment on column public.community_feedback.contributor_context is
  'Authorization context recorded at submission; host-provided content is not independent resident sentiment.';

create index analytics_events_phase13_rollup_idx
  on public.analytics_events(event_name, created_at, destination_id);

drop policy if exists privacy_limited_analytics_insert on public.analytics_events;
drop policy if exists destination_health_analytics_insert on public.analytics_events;
create policy phase13_privacy_limited_analytics_insert on public.analytics_events
  for insert to anon, authenticated with check (
    (user_id is null or user_id = (select auth.uid()))
    and event_name in (
      'destination_health_viewed', 'alternative_shown', 'alternative_selected',
      'popular_destination_retained', 'cultural_companion_question',
      'destination_viewed', 'experience_viewed', 'recommendation_generated',
      'alternative_considered', 'itinerary_generated', 'cultural_learning_interaction',
      'reflection_submitted'
    )
    and session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and metadata - array['target_destination_id', 'alternative_count', 'recommendation_count', 'experience_count'] = '{}'::jsonb
    and length(metadata::text) <= 512
    and (not (metadata ? 'target_destination_id') or (metadata->>'target_destination_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    and (not (metadata ? 'alternative_count') or (metadata->>'alternative_count') ~ '^(?:[0-9]|10)$')
    and (not (metadata ? 'recommendation_count') or (metadata->>'recommendation_count') ~ '^(?:[0-9]|[1-9][0-9]|100)$')
    and (not (metadata ? 'experience_count') or (metadata->>'experience_count') ~ '^(?:[0-9]|[1-9][0-9]|100)$')
  );

-- Legacy aggregate endpoint retained for compatibility, now destination-scoped and
-- suppressing counts unless their contributor cohort meets k=5.
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
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'dmo'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select d.id, d.name,
    case when b.traveler_cohort >= 5 then b.booking_count else null end,
    case when x.host_cohort >= 5 then x.active_count else null end,
    case when s.host_cohort >= 5 then s.remaining_capacity else null end,
    case when c.author_cohort >= 5 then c.average_pressure else null end
  from public.destination_access_assignments a
  join public.destinations d on d.id = a.destination_id and d.status = 'published'
  left join lateral (
    select count(*)::bigint booking_count, count(distinct b.traveler_id)::bigint traveler_cohort
    from public.bookings b join public.experiences e on e.id = b.experience_id
    where e.destination_id = d.id and b.status in ('confirmed', 'completed')
      and b.created_at >= date_trunc('month', now()) - interval '1 month'
      and b.created_at < date_trunc('month', now())
  ) b on true
  left join lateral (
    select count(*)::bigint active_count, count(distinct e.host_id)::bigint host_cohort
    from public.experiences e where e.destination_id = d.id and e.status = 'published'
      and e.is_verified and not e.is_paused
  ) x on true
  left join lateral (
    select coalesce(sum(greatest(s.capacity - s.booked_count, 0)), 0)::bigint remaining_capacity,
      count(distinct e.host_id)::bigint host_cohort
    from public.experience_slots s join public.experiences e on e.id = s.experience_id
    where e.destination_id = d.id and e.status = 'published' and e.is_verified and not e.is_paused
      and s.starts_at > now() and s.status = 'open'
  ) s on true
  left join lateral (
    select count(distinct cf.author_id)::bigint author_cohort,
      avg(cf.pressure_score)::numeric average_pressure
    from public.community_feedback cf
    where cf.destination_id = d.id and cf.created_at >= date_trunc('month', now()) - interval '1 month'
      and cf.created_at < date_trunc('month', now()) and cf.consent_to_aggregate
      and cf.moderation_status = 'approved' and cf.withdrawn_at is null
  ) c on true
  where a.user_id = (select auth.uid()) and a.access_scope = 'dmo_analytics' and a.revoked_at is null;
end;
$$;
revoke all on function public.dmo_destination_metrics() from public, anon, authenticated;
grant execute on function public.dmo_destination_metrics() to authenticated;

-- Fixed, disjoint calendar months prevent users from subtracting overlapping windows.
-- The function returns only k-anonymous aggregates; it never returns a profile, booking,
-- session, feedback author, comment, or traveler reflection.
create or replace function public.dmo_destination_month_metrics(
  p_destination_id uuid,
  p_month date
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_start timestamptz;
  v_end timestamptz;
begin
  if (select auth.uid()) is null
    or not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'dmo')
    or not exists (
      select 1 from public.destination_access_assignments a
      where a.user_id = (select auth.uid()) and a.destination_id = p_destination_id
        and a.access_scope = 'dmo_analytics' and a.revoked_at is null
    ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_month is null or p_month <> date_trunc('month', p_month::timestamp)::date
    or p_month < date_trunc('month', current_date::timestamp)::date - interval '24 months'
    or p_month > date_trunc('month', current_date::timestamp)::date then
    raise exception 'invalid reporting month' using errcode = '22023';
  end if;
  v_start := p_month::timestamptz;
  v_end := (p_month + interval '1 month')::timestamptz;

  with event_rollup as (
    select
      count(distinct session_id) filter (where event_name = 'destination_viewed') as destination_sessions,
      count(distinct session_id) filter (where event_name = 'experience_viewed') as experience_sessions,
      count(distinct session_id) filter (where event_name = 'recommendation_generated') as recommendation_sessions,
      count(distinct session_id) filter (where event_name = 'alternative_considered') as alternative_sessions,
      count(distinct session_id) filter (where event_name = 'itinerary_generated') as itinerary_sessions,
      count(distinct session_id) filter (where event_name = 'cultural_learning_interaction') as learning_sessions,
      count(distinct session_id) filter (where event_name = 'reflection_submitted') as reflection_sessions
    from public.analytics_events ae
    where ae.destination_id = p_destination_id and ae.created_at >= v_start and ae.created_at < v_end
      and ae.event_name in ('destination_viewed', 'experience_viewed', 'recommendation_generated',
        'alternative_considered', 'itinerary_generated', 'cultural_learning_interaction', 'reflection_submitted')
  ), bookings as (
    select count(*)::bigint as booking_count, count(distinct b.traveler_id)::bigint as traveler_cohort,
      coalesce(sum(b.total_price_jpy), 0)::bigint as booking_value
    from public.bookings b join public.experiences e on e.id = b.experience_id
    where e.destination_id = p_destination_id and b.status in ('confirmed', 'completed')
      and b.created_at >= v_start and b.created_at < v_end
  ), hosts as (
    select count(distinct e.host_id)::bigint as host_cohort, count(*)::bigint as active_experiences
    from public.experiences e where e.destination_id = p_destination_id
      and e.status = 'published' and e.is_verified and not e.is_paused
  ), slots as (
    select count(distinct e.host_id)::bigint as host_cohort,
      coalesce(sum(greatest(s.capacity - s.booked_count, 0)), 0)::bigint as remaining_capacity,
      coalesce(sum(s.booked_count), 0)::bigint as booked_guests,
      coalesce(sum(s.capacity), 0)::bigint as slot_capacity
    from public.experience_slots s join public.experiences e on e.id = s.experience_id
    where e.destination_id = p_destination_id and e.status = 'published'
      and e.is_verified and not e.is_paused and s.status = 'open'
      and s.starts_at >= v_start and s.starts_at < v_end
  ), feedback as (
    select count(distinct cf.author_id)::bigint as contributor_cohort,
      count(*) filter (where cf.sentiment = 'positive')::bigint as positive_count,
      count(*) filter (where cf.sentiment = 'neutral')::bigint as neutral_count,
      count(*) filter (where cf.sentiment = 'negative')::bigint as negative_count,
      avg(cf.pressure_score)::numeric as average_pressure
    from public.community_feedback cf
    where cf.destination_id = p_destination_id and cf.created_at >= v_start and cf.created_at < v_end
      and cf.consent_to_aggregate and cf.moderation_status = 'approved' and cf.withdrawn_at is null
  ), passport as (
    select count(distinct pa.traveler_id)::bigint as traveler_cohort,
      count(*)::bigint as achievement_count
    from public.passport_achievements pa
    join public.bookings b on b.id::text = pa.metadata->>'booking_id'
    join public.experiences e on e.id = b.experience_id
    where e.destination_id = p_destination_id
      and pa.earned_at >= v_start and pa.earned_at < v_end
  )
  select jsonb_build_object(
    'destinationId', p_destination_id,
    'month', p_month,
    'minimumCohort', 5,
    'metrics', jsonb_build_object(
      'destinationViewSessions', jsonb_build_object('value', case when er.destination_sessions >= 5 then er.destination_sessions else null end, 'state', case when er.destination_sessions >= 5 then 'available' else 'suppressed' end),
      'experienceViewSessions', jsonb_build_object('value', case when er.experience_sessions >= 5 then er.experience_sessions else null end, 'state', case when er.experience_sessions >= 5 then 'available' else 'suppressed' end),
      'recommendationSessions', jsonb_build_object('value', case when er.recommendation_sessions >= 5 then er.recommendation_sessions else null end, 'state', case when er.recommendation_sessions >= 5 then 'available' else 'suppressed' end),
      'alternativeConsiderationSessions', jsonb_build_object('value', case when er.alternative_sessions >= 5 then er.alternative_sessions else null end, 'state', case when er.alternative_sessions >= 5 then 'available' else 'suppressed' end),
      'itineraryGenerationSessions', jsonb_build_object('value', case when er.itinerary_sessions >= 5 then er.itinerary_sessions else null end, 'state', case when er.itinerary_sessions >= 5 then 'available' else 'suppressed' end),
      'culturalLearningSessions', jsonb_build_object('value', case when er.learning_sessions >= 5 then er.learning_sessions else null end, 'state', case when er.learning_sessions >= 5 then 'available' else 'suppressed' end),
      'reflectionSubmissionSessions', jsonb_build_object('value', case when er.reflection_sessions >= 5 then er.reflection_sessions else null end, 'state', case when er.reflection_sessions >= 5 then 'available' else 'suppressed' end),
      'confirmedBookingCount', jsonb_build_object('value', case when b.traveler_cohort >= 5 then b.booking_count else null end, 'state', case when b.traveler_cohort >= 5 then 'available' else 'suppressed' end),
      'recordedBookingValueJpy', jsonb_build_object('value', case when b.traveler_cohort >= 5 then b.booking_value else null end, 'state', case when b.traveler_cohort >= 5 then 'available' else 'suppressed' end),
      'activeVerifiedExperiences', jsonb_build_object('value', case when h.host_cohort >= 5 then h.active_experiences else null end, 'state', case when h.host_cohort >= 5 then 'available' else 'suppressed' end),
      'activeHostCohort', jsonb_build_object('value', case when h.host_cohort >= 5 then h.host_cohort else null end, 'state', case when h.host_cohort >= 5 then 'available' else 'suppressed' end),
      'remainingSlotCapacity', jsonb_build_object('value', case when s.host_cohort >= 5 then s.remaining_capacity else null end, 'state', case when s.host_cohort >= 5 then 'available' else 'suppressed' end),
      'slotUtilizationPercent', jsonb_build_object('value', case when s.host_cohort >= 5 and s.slot_capacity > 0 then round(s.booked_guests * 100.0 / s.slot_capacity, 1) else null end, 'state', case when s.host_cohort >= 5 and s.slot_capacity > 0 then 'available' else 'suppressed' end),
      'communityFeedback', jsonb_build_object('state', case when f.contributor_cohort >= 5 then 'available' else 'insufficient_data' end,
        'positive', case when f.contributor_cohort >= 5 then f.positive_count else null end,
        'neutral', case when f.contributor_cohort >= 5 then f.neutral_count else null end,
        'negative', case when f.contributor_cohort >= 5 then f.negative_count else null end,
        'averagePressure', case when f.contributor_cohort >= 5 then round(f.average_pressure, 1) else null end),
      'passportAchievementTravelers', jsonb_build_object('value', case when pa.traveler_cohort >= 5 then pa.traveler_cohort else null end, 'state', case when pa.traveler_cohort >= 5 then 'available' else 'suppressed' end)
    ),
    'limitations', jsonb_build_array(
      'All engagement counts describe MICHI platform activity, not total destination tourism.',
      'Booking value is recorded booking value, not verified revenue or local economic impact.',
      'Small cohorts are suppressed; suppressed values are not zero.',
      'Community aggregates include only approved, consented, non-withdrawn reports.'
    )
  ) into v_result
  from event_rollup er cross join bookings b cross join hosts h cross join slots s cross join feedback f cross join passport pa;

  return v_result;
end;
$$;
revoke all on function public.dmo_destination_month_metrics(uuid, date) from public, anon, authenticated;
grant execute on function public.dmo_destination_month_metrics(uuid, date) to authenticated;
comment on function public.dmo_destination_month_metrics(uuid, date) is
  'Returns fixed-calendar-month, destination-scoped MICHI aggregates. Requires DMO role plus active assignment; suppresses contributor cohorts below five.';
