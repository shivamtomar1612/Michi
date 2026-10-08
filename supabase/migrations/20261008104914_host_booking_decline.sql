-- A verified host may decline a pending request and release its reservation.
-- Confirmed booking cancellation stays manual until cancellation terms are structured.
create index host_applications_external_experience_idx
  on public.host_applications(external_experience_id);
create index host_applications_reviewer_idx
  on public.host_applications(reviewer_id);
create index host_invitations_external_experience_idx
  on public.host_invitations(external_experience_id);
create index host_invitations_invited_by_idx
  on public.host_invitations(invited_by);

create or replace function public.decline_experience_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  slot_row public.experience_slots%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  select * into booking_row
  from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if booking_row.status <> 'pending' or not exists (
    select 1 from public.experiences e
    join public.host_applications a on a.applicant_id = e.host_id
    where e.id = booking_row.experience_id
      and e.host_id = (select auth.uid())
      and a.status = 'verified'
  ) then
    raise exception 'forbidden or booking unavailable' using errcode = '42501';
  end if;
  select * into slot_row
  from public.experience_slots where id = booking_row.slot_id for update;
  if not found or slot_row.booked_count < booking_row.guests then
    raise exception 'slot reservation is inconsistent' using errcode = '22023';
  end if;
  update public.bookings set status = 'cancelled' where id = p_booking_id;
  update public.experience_slots
  set booked_count = booked_count - booking_row.guests,
      status = case
        when status = 'full' and booked_count - booking_row.guests < capacity
          then 'open'::public.slot_status
        else status
      end
  where id = slot_row.id;
end;
$$;
revoke all on function public.decline_experience_booking(uuid) from public, anon;
grant execute on function public.decline_experience_booking(uuid) to authenticated;
