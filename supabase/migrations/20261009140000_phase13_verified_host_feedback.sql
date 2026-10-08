-- Feedback sourced from hosts is accepted only for applicants that an administrator
-- has verified through the existing MICHI host-onboarding workflow.
drop policy if exists community_feedback_submit_authorized on public.community_feedback;
create policy community_feedback_submit_authorized on public.community_feedback
  for insert to authenticated with check (
    author_id = (select auth.uid())
    and consent_to_aggregate
    and consent_given_at is not null
    and moderation_status = 'pending'
    and withdrawn_at is null
    and submitted_on = current_date
    and (
      (contributor_context = 'host'
        and host_id = (select auth.uid())
        and public.current_app_role() = 'host'
        and exists (
          select 1 from public.host_applications h
          where h.applicant_id = (select auth.uid()) and h.status = 'verified'
        )
        and exists (
          select 1 from public.experiences e
          where e.host_id = (select auth.uid()) and e.destination_id = community_feedback.destination_id
        ))
      or
      (contributor_context = 'community_representative'
        and host_id is null
        and exists (
          select 1 from public.destination_access_assignments a
          where a.user_id = (select auth.uid())
            and a.destination_id = community_feedback.destination_id
            and a.access_scope = 'community_representative'
            and a.revoked_at is null
        ))
    )
  );
