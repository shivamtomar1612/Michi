-- Immediate withdrawal removes the narrative and numeric pressure observation while
-- retaining a minimal tombstone so the same report cannot re-enter aggregation.
create or replace function public.withdraw_community_feedback(p_feedback_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_updated integer;
begin
  if (select auth.uid()) is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.community_feedback
    set moderation_status = 'withdrawn', withdrawn_at = now(),
      comment = '', pressure_score = null,
      consent_to_aggregate = false, consent_given_at = null
    where id = p_feedback_id and author_id = (select auth.uid())
      and withdrawn_at is null and moderation_status <> 'withdrawn';
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
revoke all on function public.withdraw_community_feedback(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_community_feedback(uuid) to authenticated;
comment on function public.withdraw_community_feedback(uuid) is
  'Author-only withdrawal clears report narrative and pressure score immediately and prevents future aggregate use.';
