-- Reflection engagement is derived from the canonical private reflection records,
-- never from text or client event payloads. Only distinct traveler counts are returned.
create or replace function public.dmo_reflection_month_metric(
  p_destination_id uuid,
  p_month date
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_travelers bigint;
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
  select count(distinct r.traveler_id)::bigint into v_travelers
  from public.traveler_reflections r
  join public.bookings b on b.id = r.booking_id and b.status = 'completed'
  join public.experiences e on e.id = b.experience_id
  where e.destination_id = p_destination_id
    and r.created_at >= p_month::timestamptz
    and r.created_at < (p_month + interval '1 month')::timestamptz;
  return jsonb_build_object(
    'value', case when v_travelers >= 5 then v_travelers else null end,
    'state', case when v_travelers >= 5 then 'available' else 'suppressed' end
  );
end;
$$;
revoke all on function public.dmo_reflection_month_metric(uuid, date) from public, anon, authenticated;
grant execute on function public.dmo_reflection_month_metric(uuid, date) to authenticated;
comment on function public.dmo_reflection_month_metric(uuid, date) is
  'Returns only a suppressed or threshold-qualified distinct traveler count for private reflections; no text or identity is returned.';
