-- Keep public discovery policy expressions independent from authenticated admin checks.
drop policy if exists cultural_content_read on public.cultural_content;
create policy cultural_content_public_read on public.cultural_content
  for select to anon, authenticated
  using (
    is_active
    and verification_status in ('official_verified', 'community_verified')
    and last_verified_at is not null
    and (next_verification_at is null or next_verification_at > now())
    and (
      ((is_time_sensitive or category in ('opening_information', 'festival')) and last_verified_at > now() - interval '6 hours')
      or
      (not (is_time_sensitive or category in ('opening_information', 'festival')) and last_verified_at > now() - interval '180 days')
    )
    and exists (
      select 1 from public.cultural_sources s
      where s.id = cultural_content.source_id
        and s.is_active
        and s.status = 'verified'
        and (s.stale_after is null or s.stale_after > now())
    )
    and (
      experience_id is null
      or exists (
        select 1 from public.experiences e
        where e.id = cultural_content.experience_id
          and e.is_verified
          and e.status = 'published'
          and not e.is_paused
      )
    )
  );
create policy cultural_content_admin_read on public.cultural_content
  for select to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists cultural_sources_read on public.cultural_sources;
create policy cultural_sources_public_read on public.cultural_sources
  for select to anon, authenticated
  using (
    is_active
    and status = 'verified'
    and (stale_after is null or stale_after > now())
  );
create policy cultural_sources_admin_read on public.cultural_sources
  for select to authenticated
  using (public.current_app_role() = 'admin');
