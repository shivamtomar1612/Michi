-- Make the public/admin read boundary explicit and avoid overlapping permissive policies.
drop policy if exists cultural_sources_published_read on public.cultural_sources;
drop policy if exists cultural_sources_admin_manage on public.cultural_sources;
drop policy if exists cultural_content_published_read on public.cultural_content;
drop policy if exists cultural_content_admin_manage on public.cultural_content;

create policy cultural_sources_read on public.cultural_sources for select to anon, authenticated using (
  (is_active and status = 'verified' and (stale_after is null or stale_after > now()))
  or case when (select auth.role()) = 'authenticated' then public.current_app_role() = 'admin' else false end
);
create policy cultural_sources_admin_insert on public.cultural_sources for insert to authenticated
  with check (public.current_app_role() = 'admin');
create policy cultural_sources_admin_update on public.cultural_sources for update to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy cultural_content_read on public.cultural_content for select to anon, authenticated using (
  (
    is_active and verification_status in ('official_verified', 'community_verified')
    and last_verified_at is not null
    and (next_verification_at is null or next_verification_at > now())
    and (
      (is_time_sensitive or category in ('opening_information','festival')) and last_verified_at > now() - interval '6 hours'
      or not (is_time_sensitive or category in ('opening_information','festival')) and last_verified_at > now() - interval '180 days'
    )
    and exists (select 1 from public.cultural_sources s where s.id = source_id and s.is_active and s.status = 'verified' and (s.stale_after is null or s.stale_after > now()))
    and (experience_id is null or exists (select 1 from public.experiences e where e.id = experience_id and e.is_verified and e.status = 'published' and not e.is_paused))
  )
  or case when (select auth.role()) = 'authenticated' then public.current_app_role() = 'admin' else false end
);
create policy cultural_content_admin_insert on public.cultural_content for insert to authenticated
  with check (public.current_app_role() = 'admin');
create policy cultural_content_admin_update on public.cultural_content for update to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy cultural_evidence_requests_no_client_access on public.cultural_evidence_requests for all to anon, authenticated using (false) with check (false);
create policy cultural_ingestion_attempts_no_client_access on public.cultural_ingestion_attempts for all to anon, authenticated using (false) with check (false);

create index if not exists cultural_content_experience_active_idx on public.cultural_content(experience_id) where experience_id is not null;
create index if not exists cultural_ingestion_attempts_user_time_idx on public.cultural_ingestion_attempts(user_id, attempted_at desc);
create index if not exists cultural_sources_terms_reviewed_by_idx on public.cultural_sources(terms_reviewed_by) where terms_reviewed_by is not null;
