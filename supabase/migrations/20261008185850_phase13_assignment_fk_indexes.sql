-- Cover assignment-table foreign keys identified by the hosted Supabase advisor.
create index if not exists destination_access_destination_idx
  on public.destination_access_assignments(destination_id);

create index if not exists destination_access_granted_by_idx
  on public.destination_access_assignments(granted_by);
