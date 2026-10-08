-- Privileged, atomic assignment management. These RPCs are callable only by the
-- server's service-role client after its independent admin-role check.
create or replace function public.admin_grant_destination_access(
  p_admin_id uuid,
  p_user_id uuid,
  p_destination_id uuid,
  p_access_scope text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role;
  v_assignment_id uuid;
begin
  if p_admin_id is null or not exists (
    select 1 from public.profiles p where p.id = p_admin_id and p.role = 'admin'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_access_scope not in ('dmo_analytics', 'community_representative') then
    raise exception 'invalid access scope' using errcode = '22023';
  end if;
  if not exists (select 1 from public.destinations d where d.id = p_destination_id and d.status = 'published') then
    raise exception 'destination unavailable' using errcode = '22023';
  end if;
  select p.role into v_role from public.profiles p where p.id = p_user_id for update;
  if not found then raise exception 'profile not found' using errcode = '22023'; end if;

  if p_access_scope = 'dmo_analytics' then
    if v_role not in ('traveler', 'dmo') then
      raise exception 'target account cannot receive DMO access' using errcode = '42501';
    end if;
    if v_role = 'traveler' then
      update public.profiles set role = 'dmo' where id = p_user_id;
    end if;
  end if;

  insert into public.destination_access_assignments(user_id, destination_id, access_scope, granted_by)
  values (p_user_id, p_destination_id, p_access_scope, p_admin_id)
  on conflict (user_id, destination_id, access_scope) where revoked_at is null
  do update set granted_by = excluded.granted_by, granted_at = now()
  returning id into v_assignment_id;
  return v_assignment_id;
end;
$$;
revoke all on function public.admin_grant_destination_access(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_grant_destination_access(uuid, uuid, uuid, text) to service_role;

create or replace function public.admin_revoke_destination_access(
  p_admin_id uuid,
  p_assignment_id uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_updated integer;
begin
  if p_admin_id is null or not exists (
    select 1 from public.profiles p where p.id = p_admin_id and p.role = 'admin'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.destination_access_assignments
    set revoked_at = now()
    where id = p_assignment_id and revoked_at is null;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
revoke all on function public.admin_revoke_destination_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_destination_access(uuid, uuid) to service_role;

comment on function public.admin_grant_destination_access(uuid, uuid, uuid, text) is
  'Atomic admin-only DMO/community-representative assignment. Service-role execution is restricted to the server-side admin client.';
comment on function public.admin_revoke_destination_access(uuid, uuid) is
  'Revokes a single destination assignment after server-side admin authorization.';
