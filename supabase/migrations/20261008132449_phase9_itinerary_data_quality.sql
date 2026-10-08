-- Keep the added decision foreign keys efficient as the event history grows.
create index itinerary_decisions_experience_idx
  on public.itinerary_decisions(experience_id) where experience_id is not null;
create index itinerary_decisions_external_experience_idx
  on public.itinerary_decisions(external_experience_id) where external_experience_id is not null;

-- Share only item snapshots the traveler explicitly chose to share.
create or replace function public.get_shared_itinerary(p_share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id,
    'name', i.name,
    'start_date', i.start_date,
    'end_date', i.end_date,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'title', item.title,
        'item_type', item.item_type,
        'starts_at', item.starts_at,
        'ends_at', item.ends_at,
        'sequence', item.sequence,
        'estimated_cost_jpy', item.estimated_cost_jpy,
        'cost_status', item.cost_status,
        'cultural_context_snapshot', item.cultural_context_snapshot,
        'transport_estimate', item.transport_estimate,
        'data_status', item.data_status,
        'booking_mode', item.booking_mode,
        'availability_status', item.availability_status,
        'availability_checked_at', item.availability_checked_at,
        'destination_health_score', item.destination_health_score,
        'destination_health_status', item.destination_health_status,
        'crowd_score', item.crowd_score,
        'local_benefit_score', item.local_benefit_score,
        'recommendation_score', item.recommendation_score,
        'interest_compatibility', item.interest_compatibility,
        'suggestion_origin', item.suggestion_origin,
        'source_name', item.source_name,
        'source_url', item.source_url,
        'source_verified_at', item.source_verified_at
      ) order by item.sequence)
      from public.itinerary_items item where item.itinerary_id = i.id
    ), '[]'::jsonb)
  )
  from public.itineraries i
  where i.share_token = p_share_token and i.visibility = 'shared';
$$;
revoke all on function public.get_shared_itinerary(uuid) from public;
grant execute on function public.get_shared_itinerary(uuid) to anon, authenticated;
