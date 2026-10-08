-- Limit duplicate open reports and cap authenticated report creation per account.
create unique index content_reports_one_open_subject_idx
  on public.content_reports(reporter_id, subject_type, subject_id)
  where status in ('pending', 'under_review');

create or replace function private.enforce_content_report_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recent_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.reporter_id::text || current_date::text, 0));
  select count(*)::integer into recent_count
    from public.content_reports r
    where r.reporter_id = new.reporter_id and r.created_at >= now() - interval '24 hours';
  if recent_count >= 10 then
    raise exception 'report rate limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_content_report_rate_limit() from public, anon, authenticated;
create trigger content_reports_rate_limit
  before insert on public.content_reports
  for each row execute function private.enforce_content_report_rate_limit();
