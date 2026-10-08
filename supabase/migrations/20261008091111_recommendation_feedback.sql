-- Keep recommendation choices private to the traveler who requested them.
create table public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  recommendation_log_id uuid not null references public.recommendation_logs(id) on delete cascade,
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (recommendation_log_id, experience_id)
);

create index recommendation_feedback_owner_idx
  on public.recommendation_feedback(traveler_id, created_at desc);

alter table public.recommendation_feedback enable row level security;
revoke all on public.recommendation_feedback from anon, authenticated;
grant all privileges on public.recommendation_feedback to service_role;
grant select, insert on public.recommendation_feedback to authenticated;
grant update (decision) on public.recommendation_feedback to authenticated;

create policy recommendation_feedback_owner_read
  on public.recommendation_feedback for select to authenticated
  using (traveler_id = (select auth.uid()));

create policy recommendation_feedback_owner_insert
  on public.recommendation_feedback for insert to authenticated
  with check (
    traveler_id = (select auth.uid())
    and exists (
      select 1 from public.recommendation_logs rl
      where rl.id = recommendation_log_id
        and rl.traveler_id = (select auth.uid())
    )
  );

create policy recommendation_feedback_owner_update
  on public.recommendation_feedback for update to authenticated
  using (
    traveler_id = (select auth.uid())
    and exists (
      select 1 from public.recommendation_logs rl
      where rl.id = recommendation_log_id
        and rl.traveler_id = (select auth.uid())
    )
  )
  with check (
    traveler_id = (select auth.uid())
    and exists (
      select 1 from public.recommendation_logs rl
      where rl.id = recommendation_log_id
        and rl.traveler_id = (select auth.uid())
    )
  );

comment on table public.recommendation_feedback is
  'Accepted or rejected recommendation choices. Each traveler can read and change decisions only for their own recommendation logs.';
