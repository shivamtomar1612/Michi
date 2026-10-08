-- Record all moderator decisions, including changes limited to private reviewer notes.
-- The note contents are deliberately excluded from the audit metadata.
create or replace function private.audit_content_report_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
    or new.reviewer_reason is distinct from old.reviewer_reason
    or new.reviewer_note is distinct from old.reviewer_note then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, outcome, metadata)
    values (new.reviewer_id, 'content_report.reviewed', 'content_report', new.id::text,
      'success', jsonb_build_object(
        'previous_status', old.status,
        'new_status', new.status,
        'reason_code', new.reviewer_reason,
        'reviewer_note_changed', new.reviewer_note is distinct from old.reviewer_note
      ));
  elsif new.appeal_requested_at is distinct from old.appeal_requested_at and new.appeal_requested_at is not null then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, outcome, metadata)
    values (new.reporter_id, 'content_report.appeal_requested', 'content_report', new.id::text,
      'success', jsonb_build_object('status', new.status));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_content_report_review() from public, anon, authenticated;
