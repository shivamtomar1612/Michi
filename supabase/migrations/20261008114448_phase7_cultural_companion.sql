-- Durable, anonymous rate limiting for Gemini-backed cultural questions.
create table if not exists public.cultural_companion_rate_limits (
  requester_hash text primary key check (requester_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.cultural_companion_rate_limits enable row level security;
revoke all on public.cultural_companion_rate_limits from public, anon, authenticated;

create or replace function public.consume_cultural_companion_limit(p_requester_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  next_count integer;
begin
  if p_requester_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('cultural-companion:' || p_requester_hash, 0));
  insert into public.cultural_companion_rate_limits(requester_hash, window_started_at, request_count, updated_at)
  values (p_requester_hash, v_now, 1, v_now)
  on conflict (requester_hash) do update set
    window_started_at = case
      when public.cultural_companion_rate_limits.window_started_at <= v_now - interval '1 minute' then v_now
      else public.cultural_companion_rate_limits.window_started_at
    end,
    request_count = case
      when public.cultural_companion_rate_limits.window_started_at <= v_now - interval '1 minute' then 1
      else public.cultural_companion_rate_limits.request_count + 1
    end,
    updated_at = v_now
  returning request_count into next_count;
  return next_count <= 8;
end;
$$;
revoke all on function public.consume_cultural_companion_limit(text) from public, anon, authenticated;
grant execute on function public.consume_cultural_companion_limit(text) to service_role;

-- Anonymous companion telemetry contains no question, transcript, or profile ID.
drop policy if exists destination_health_analytics_insert on public.analytics_events;
create policy privacy_limited_analytics_insert on public.analytics_events
  for insert to anon, authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and event_name in (
      'destination_health_viewed', 'alternative_shown',
      'alternative_selected', 'popular_destination_retained',
      'cultural_companion_question'
    )
    and session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
