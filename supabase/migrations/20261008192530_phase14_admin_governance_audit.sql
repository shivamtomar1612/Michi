-- Phase 14: append-only audit history and a private, appealable content report queue.
-- This migration is additive; existing production records and policies remain intact.

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  target_type text not null check (target_type ~ '^[a-z][a-z0-9_.-]{1,39}$'),
  target_id text check (target_id is null or length(target_id) <= 160),
  outcome text not null check (outcome in ('success', 'denied', 'failed')),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 2048
    and not (metadata ?| array['email','phone','address','comment','reflection','secret','token','password','api_key','credential','authorization','cookie','note'])
  ),
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log(created_at desc, id desc);
create index admin_audit_log_target_idx on public.admin_audit_log(target_type, target_id, created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log(actor_id, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;
grant select, insert on public.admin_audit_log to service_role;
create policy admin_audit_log_admin_read on public.admin_audit_log
  for select to authenticated using (public.current_app_role() = 'admin');

create or replace function private.prevent_admin_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'admin audit records are append-only' using errcode = '42501';
end;
$$;
revoke all on function private.prevent_admin_audit_mutation() from public, anon, authenticated;
create trigger admin_audit_log_append_only
  before update or delete on public.admin_audit_log
  for each row execute function private.prevent_admin_audit_mutation();

-- Record security-sensitive state changes in the same transaction as their existing RPC.
create or replace function private.audit_host_governance_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'host_applications'
    and new.status is distinct from old.status
    and new.reviewer_id is not null then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, outcome, metadata)
    values (coalesce((select auth.uid()), new.reviewer_id), 'host_application.reviewed', 'host_application', new.id::text,
      'success', jsonb_build_object(
        'previous_status', old.status::text,
        'new_status', new.status::text,
        'ownership_checked', new.status <> 'verified'::public.host_application_status or old.status in ('submitted','under_review'),
        'review_note_present', nullif(btrim(new.review_note), '') is not null
      ));
  elsif tg_table_name = 'experiences'
    and (new.is_verified is distinct from old.is_verified or new.status is distinct from old.status) then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, outcome, metadata)
    values ((select auth.uid()), 'experience.governance_state_changed', 'experience', new.id::text,
      'success', jsonb_build_object(
        'previous_status', old.status::text,
        'new_status', new.status::text,
        'previously_verified', old.is_verified,
        'verified', new.is_verified
      ));
  elsif tg_table_name = 'cultural_content'
    and (new.verification_status is distinct from old.verification_status or new.is_active is distinct from old.is_active)
    and new.reviewed_by is not null then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, outcome, metadata)
    values (new.reviewed_by, 'cultural_content.reviewed', 'cultural_content', new.id::text,
      'success', jsonb_build_object(
        'verification_status', new.verification_status,
        'active', new.is_active
      ));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_host_governance_change() from public, anon, authenticated;
create trigger host_applications_admin_audit
  after update of status on public.host_applications
  for each row execute function private.audit_host_governance_change();
create trigger experiences_admin_audit
  after update of is_verified, status on public.experiences
  for each row execute function private.audit_host_governance_change();
create trigger cultural_content_admin_audit
  after update of verification_status, is_active on public.cultural_content
  for each row execute function private.audit_host_governance_change();

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  subject_type text not null check (subject_type in ('destination','place','external_experience','experience','cultural_content')),
  subject_id uuid not null,
  reason_code text not null check (reason_code in ('inaccurate','safety','cultural_concern','accessibility','misleading_commercial_claim','privacy','other')),
  details text not null check (char_length(btrim(details)) between 10 and 1200),
  status text not null default 'pending' check (status in ('pending','under_review','resolved','dismissed')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_reason text check (reviewer_reason is null or char_length(reviewer_reason) <= 80),
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 1200),
  reviewed_at timestamptz,
  appeal_message text check (appeal_message is null or char_length(appeal_message) between 10 and 1200),
  appeal_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('resolved','dismissed')) = (reviewed_at is not null)),
  check ((appeal_message is null) = (appeal_requested_at is null))
);

create index content_reports_queue_idx on public.content_reports(status, created_at asc);
create index content_reports_subject_idx on public.content_reports(subject_type, subject_id, created_at desc);
create index content_reports_reporter_idx on public.content_reports(reporter_id, created_at desc);
alter table public.content_reports enable row level security;
revoke all on public.content_reports from public, anon, authenticated;
grant select, insert, update on public.content_reports to authenticated;
grant all on public.content_reports to service_role;
create policy content_reports_read_own on public.content_reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy content_reports_admin_read on public.content_reports
  for select to authenticated using (public.current_app_role() = 'admin');
create policy content_reports_submit_own on public.content_reports
  for insert to authenticated with check (
    reporter_id = (select auth.uid()) and status = 'pending' and reviewer_id is null
    and reviewed_at is null and appeal_message is null and appeal_requested_at is null
  );
create policy content_reports_appeal_own on public.content_reports
  for update to authenticated using (
    reporter_id = (select auth.uid()) and status in ('resolved','dismissed') and appeal_requested_at is null
  ) with check (
    reporter_id = (select auth.uid()) and status in ('resolved','dismissed')
    and appeal_message is not null and appeal_requested_at is not null
  );
revoke update on public.content_reports from authenticated;
revoke insert on public.content_reports from authenticated;
grant insert (reporter_id, subject_type, subject_id, reason_code, details)
  on public.content_reports to authenticated;
grant update (appeal_message, appeal_requested_at)
  on public.content_reports to authenticated;

create or replace function private.validate_content_report_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_exists boolean := false;
begin
  case new.subject_type
    when 'destination' then select exists(select 1 from public.destinations where id = new.subject_id and status = 'published') into target_exists;
    when 'place' then select exists(select 1 from public.places where id = new.subject_id and verification_status in ('verified_official','verified_primary')) into target_exists;
    when 'external_experience' then select exists(select 1 from public.external_experiences where id = new.subject_id and verification_status in ('verified_official','verified_primary')) into target_exists;
    when 'experience' then select exists(select 1 from public.experiences where id = new.subject_id and status = 'published' and is_verified) into target_exists;
    when 'cultural_content' then select exists(select 1 from public.cultural_content where id = new.subject_id and is_active) into target_exists;
  end case;
  if not target_exists then raise exception 'report target not found' using errcode = 'P0002'; end if;
  return new;
end;
$$;
revoke all on function private.validate_content_report_target() from public, anon, authenticated;
create trigger content_reports_validate_target
  before insert on public.content_reports for each row execute function private.validate_content_report_target();

create or replace function private.audit_content_report_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.reviewer_reason is distinct from old.reviewer_reason then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, outcome, metadata)
    values (new.reviewer_id, 'content_report.reviewed', 'content_report', new.id::text,
      'success', jsonb_build_object('previous_status', old.status, 'new_status', new.status, 'reason_code', new.reviewer_reason));
  elsif new.appeal_requested_at is distinct from old.appeal_requested_at and new.appeal_requested_at is not null then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, outcome, metadata)
    values (new.reporter_id, 'content_report.appeal_requested', 'content_report', new.id::text,
      'success', jsonb_build_object('status', new.status));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_content_report_review() from public, anon, authenticated;
create trigger content_reports_audit
  after update on public.content_reports for each row execute function private.audit_content_report_review();
