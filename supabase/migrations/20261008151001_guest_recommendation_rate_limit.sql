create table if not exists public.guest_request_limits (
  requester_hash text not null check (requester_hash ~ '^[a-f0-9]{64}$'),
  route_key text not null check (route_key in ('recommendations')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (requester_hash, route_key)
);

create index if not exists guest_request_limits_updated_idx
  on public.guest_request_limits(updated_at);

alter table public.guest_request_limits enable row level security;
revoke all on public.guest_request_limits from public, anon, authenticated;
grant all on public.guest_request_limits to service_role;

create or replace function public.consume_guest_request_limit(
  p_requester_hash text,
  p_route_key text,
  p_max_requests integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  next_count integer;
begin
  if p_requester_hash !~ '^[a-f0-9]{64}$'
    or p_route_key <> 'recommendations'
    or p_max_requests < 1 or p_max_requests > 60 then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_route_key || ':' || p_requester_hash, 0));
  delete from public.guest_request_limits where updated_at < v_now - interval '1 day';
  insert into public.guest_request_limits(requester_hash, route_key, window_started_at, request_count, updated_at)
  values (p_requester_hash, p_route_key, v_now, 1, v_now)
  on conflict (requester_hash, route_key) do update set
    window_started_at = case
      when public.guest_request_limits.window_started_at <= v_now - interval '1 minute' then v_now
      else public.guest_request_limits.window_started_at
    end,
    request_count = case
      when public.guest_request_limits.window_started_at <= v_now - interval '1 minute' then 1
      else public.guest_request_limits.request_count + 1
    end,
    updated_at = v_now
  returning request_count into next_count;
  return next_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_guest_request_limit(text, text, integer) from public, anon, authenticated;
grant execute on function public.consume_guest_request_limit(text, text, integer) to service_role;
