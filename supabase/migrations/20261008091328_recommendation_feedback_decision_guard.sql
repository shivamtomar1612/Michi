-- Make direct authenticated Data API inserts obey the same log-membership check as the app endpoint.
drop policy recommendation_feedback_owner_insert on public.recommendation_feedback;

create policy recommendation_feedback_owner_insert
  on public.recommendation_feedback for insert to authenticated
  with check (
    traveler_id = (select auth.uid())
    and exists (
      select 1 from public.recommendation_logs rl
      where rl.id = recommendation_log_id
        and rl.traveler_id = (select auth.uid())
        and jsonb_typeof(rl.recommendations) = 'array'
        and exists (
          select 1 from jsonb_array_elements(rl.recommendations) saved_recommendation
          where saved_recommendation ->> 'id' = recommendation_feedback.experience_id::text
        )
    )
  );
