-- Tighten sentiment release to five distinct contributors per context and sentiment.
-- The original aggregate RPC is retained as a private implementation detail; its
-- direct API grant is revoked. This public wrapper returns only threshold-qualified
-- counts for host observations and community representatives separately.
alter function public.dmo_destination_month_metrics(uuid, date)
  rename to dmo_destination_month_metrics_internal;
revoke all on function public.dmo_destination_month_metrics_internal(uuid, date)
  from public, anon, authenticated, service_role;

create or replace function public.dmo_destination_month_metrics(
  p_destination_id uuid,
  p_month date
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_community jsonb;
  v_hosts jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_community_cohort bigint;
  v_community_positive bigint;
  v_community_neutral bigint;
  v_community_negative bigint;
  v_community_pressure_cohort bigint;
  v_community_pressure numeric;
  v_host_cohort bigint;
  v_host_positive bigint;
  v_host_neutral bigint;
  v_host_negative bigint;
  v_host_pressure_cohort bigint;
  v_host_pressure numeric;
begin
  -- The internal implementation independently verifies role, scope, and month.
  v_result := public.dmo_destination_month_metrics_internal(p_destination_id, p_month);
  v_start := p_month::timestamptz;
  v_end := (p_month + interval '1 month')::timestamptz;

  with author_month as (
    select cf.contributor_context, cf.author_id,
      bool_or(cf.sentiment = 'positive') as positive,
      bool_or(cf.sentiment = 'neutral') as neutral,
      bool_or(cf.sentiment = 'negative') as negative,
      avg(cf.pressure_score)::numeric as average_pressure
    from public.community_feedback cf
    where cf.destination_id = p_destination_id
      and cf.created_at >= v_start and cf.created_at < v_end
      and cf.consent_to_aggregate and cf.moderation_status = 'approved'
      and cf.withdrawn_at is null and cf.author_id is not null
    group by cf.contributor_context, cf.author_id
  )
  select
    count(*) filter (where contributor_context = 'community_representative'),
    count(*) filter (where contributor_context = 'community_representative' and positive),
    count(*) filter (where contributor_context = 'community_representative' and neutral),
    count(*) filter (where contributor_context = 'community_representative' and negative),
    count(*) filter (where contributor_context = 'community_representative' and average_pressure is not null),
    avg(average_pressure) filter (where contributor_context = 'community_representative' and average_pressure is not null),
    count(*) filter (where contributor_context = 'host'),
    count(*) filter (where contributor_context = 'host' and positive),
    count(*) filter (where contributor_context = 'host' and neutral),
    count(*) filter (where contributor_context = 'host' and negative),
    count(*) filter (where contributor_context = 'host' and average_pressure is not null),
    avg(average_pressure) filter (where contributor_context = 'host' and average_pressure is not null)
  into v_community_cohort, v_community_positive, v_community_neutral, v_community_negative,
    v_community_pressure_cohort, v_community_pressure,
    v_host_cohort, v_host_positive, v_host_neutral, v_host_negative,
    v_host_pressure_cohort, v_host_pressure
  from author_month;

  v_community := jsonb_build_object(
    'state', case when v_community_cohort >= 5 then 'available' else 'insufficient_data' end,
    'positive', case when v_community_positive >= 5 then v_community_positive else null end,
    'positiveState', case when v_community_positive >= 5 then 'available' else 'insufficient_data' end,
    'neutral', case when v_community_neutral >= 5 then v_community_neutral else null end,
    'neutralState', case when v_community_neutral >= 5 then 'available' else 'insufficient_data' end,
    'negative', case when v_community_negative >= 5 then v_community_negative else null end,
    'negativeState', case when v_community_negative >= 5 then 'available' else 'insufficient_data' end,
    'averagePressure', case when v_community_pressure_cohort >= 5 then round(v_community_pressure, 1) else null end,
    'pressureState', case when v_community_pressure_cohort >= 5 then 'available' else 'insufficient_data' end
  );
  v_hosts := jsonb_build_object(
    'state', case when v_host_cohort >= 5 then 'available' else 'insufficient_data' end,
    'positive', case when v_host_positive >= 5 then v_host_positive else null end,
    'positiveState', case when v_host_positive >= 5 then 'available' else 'insufficient_data' end,
    'neutral', case when v_host_neutral >= 5 then v_host_neutral else null end,
    'neutralState', case when v_host_neutral >= 5 then 'available' else 'insufficient_data' end,
    'negative', case when v_host_negative >= 5 then v_host_negative else null end,
    'negativeState', case when v_host_negative >= 5 then 'available' else 'insufficient_data' end,
    'averagePressure', case when v_host_pressure_cohort >= 5 then round(v_host_pressure, 1) else null end,
    'pressureState', case when v_host_pressure_cohort >= 5 then 'available' else 'insufficient_data' end
  );
  v_result := jsonb_set(v_result, '{metrics,communityFeedback}', v_community, true);
  v_result := jsonb_set(v_result, '{metrics,hostObservations}', v_hosts, true);
  return v_result;
end;
$$;
revoke all on function public.dmo_destination_month_metrics(uuid, date) from public, anon, authenticated;
grant execute on function public.dmo_destination_month_metrics(uuid, date) to authenticated;
comment on function public.dmo_destination_month_metrics(uuid, date) is
  'Scoped aggregate wrapper: community-representative and host sentiment are separate; each displayed category requires five distinct contributors.';
