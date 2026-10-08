create index if not exists cultural_companion_rate_limits_updated_idx
  on public.cultural_companion_rate_limits(updated_at);

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
  delete from public.cultural_companion_rate_limits
  where updated_at < v_now - interval '1 day' and requester_hash <> p_requester_hash;
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
