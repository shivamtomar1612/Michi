-- Keep private administrator notes out of authenticated PostgREST reads.
revoke select on public.content_reports from authenticated;
grant select (
  id, reporter_id, subject_type, subject_id, reason_code, details, status,
  reviewer_reason, reviewed_at, appeal_message, appeal_requested_at, created_at, updated_at
) on public.content_reports to authenticated;

alter table public.admin_audit_log drop constraint admin_audit_log_metadata_check;
alter table public.admin_audit_log add constraint admin_audit_log_metadata_check check (
  jsonb_typeof(metadata) = 'object'
  and octet_length(metadata::text) <= 2048
  and not (metadata ?| array[
    'email','phone','address','comment','reflection','secret','token','password',
    'api_key','credential','authorization','cookie','note','review_note','reviewer_note'
  ])
);

create trigger content_reports_set_updated_at
  before update on public.content_reports
  for each row execute function public.set_updated_at();

create or replace function private.validate_content_report_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_exists boolean := false;
begin
  case new.subject_type
    when 'destination' then
      select exists(select 1 from public.destinations where id = new.subject_id
        and status = 'published' and verification_status = 'verified_official'
        and data_status = 'official_tourism' and source_id is not null and source_url is not null
        and last_verified_at is not null) into target_exists;
    when 'place' then
      select exists(select 1 from public.places where id = new.subject_id
        and verification_status in ('verified_official','verified_primary')
        and data_status in ('verified_official','verified_primary','official_tourism')
        and last_verified_at is not null) into target_exists;
    when 'external_experience' then
      select exists(select 1 from public.external_experiences where id = new.subject_id
        and verification_status in ('verified_official','verified_primary')
        and data_status in ('verified_official','verified_primary','official_tourism')) into target_exists;
    when 'experience' then
      select exists(select 1 from public.experiences e where e.id = new.subject_id
        and e.status = 'published' and e.is_verified and not e.is_paused
        and private.verified_host(e.host_id)) into target_exists;
    when 'cultural_content' then
      select exists(select 1 from public.cultural_content c join public.cultural_sources s on s.id = c.source_id
        where c.id = new.subject_id and c.is_active
          and c.verification_status in ('official_verified','community_verified')
          and c.last_verified_at is not null
          and (c.next_verification_at is null or c.next_verification_at > now())
          and s.is_active and s.status = 'verified'
          and (s.stale_after is null or s.stale_after > now())) into target_exists;
  end case;
  if not target_exists then raise exception 'report target not found' using errcode = 'P0002'; end if;
  return new;
end;
$$;
revoke all on function private.validate_content_report_target() from public, anon, authenticated;
