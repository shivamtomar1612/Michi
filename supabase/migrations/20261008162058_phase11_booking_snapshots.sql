alter table public.bookings
  add column if not exists experience_title_snapshot text,
  add column if not exists slot_starts_at_snapshot timestamptz,
  add column if not exists slot_ends_at_snapshot timestamptz;

update public.bookings b
set experience_title_snapshot = e.title,
    slot_starts_at_snapshot = s.starts_at,
    slot_ends_at_snapshot = s.ends_at
from public.experiences e, public.experience_slots s
where e.id = b.experience_id and s.id = b.slot_id
  and (b.experience_title_snapshot is null or b.slot_starts_at_snapshot is null or b.slot_ends_at_snapshot is null);

create or replace function private.set_booking_detail_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select e.title, s.starts_at, s.ends_at
  into new.experience_title_snapshot, new.slot_starts_at_snapshot, new.slot_ends_at_snapshot
  from public.experiences e
  join public.experience_slots s on s.experience_id = e.id
  where e.id = new.experience_id and s.id = new.slot_id;
  if new.experience_title_snapshot is null or new.slot_starts_at_snapshot is null
     or new.slot_ends_at_snapshot is null then
    raise exception 'booking experience and slot details are required' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.set_booking_detail_snapshot() from public, anon, authenticated;

drop trigger if exists bookings_set_detail_snapshot on public.bookings;
create trigger bookings_set_detail_snapshot
before insert on public.bookings
for each row execute function private.set_booking_detail_snapshot();
