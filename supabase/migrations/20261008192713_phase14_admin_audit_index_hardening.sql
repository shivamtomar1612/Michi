-- Add a covering index for the optional reviewer foreign key used by report operations.
create index content_reports_reviewer_idx
  on public.content_reports(reviewer_id, reviewed_at desc)
  where reviewer_id is not null;

-- Clarify the immutable audit evidence captured by the host approval RPC.
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
        'ownership_verified', new.status = 'verified'::public.host_application_status,
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
