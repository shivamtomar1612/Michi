select issue, records
from (
  select 'destination_missing_provenance' as issue, count(*) as records
  from public.destinations
  where status = 'published' and data_status in ('verified_official','official_tourism')
    and (source_id is null or source_url is null or source_name is null or last_verified_at is null)
  union all
  select 'place_missing_provenance', count(*)
  from public.places
  where data_status in ('verified_official','verified_primary','official_tourism')
    and (source_id is null or source_url is null or canonical_source_url is null or source_name is null or last_verified_at is null)
  union all
  select 'external_listing_missing_provenance', count(*)
  from public.external_experiences
  where data_status in ('verified_official','verified_primary','official_tourism')
    and (source_id is null or source_url is null or canonical_source_url is null or source_name is null or last_verified_at is null)
  union all
  select 'external_listing_michi_booking_enabled', count(*)
  from public.external_experiences where michi_booking_enabled
) checks
order by issue;

do $$
begin
  if exists (
    select 1 from public.destinations
    where status = 'published' and data_status in ('verified_official','official_tourism')
      and (source_id is null or source_url is null or source_name is null or last_verified_at is null)
  ) then raise exception 'Published verified destination missing provenance'; end if;
  if exists (
    select 1 from public.places
    where data_status in ('verified_official','verified_primary','official_tourism')
      and (source_id is null or source_url is null or canonical_source_url is null or source_name is null or last_verified_at is null)
  ) then raise exception 'Verified place missing provenance'; end if;
  if exists (
    select 1 from public.external_experiences
    where data_status in ('verified_official','verified_primary','official_tourism')
      and (source_id is null or source_url is null or canonical_source_url is null or source_name is null or last_verified_at is null)
  ) then raise exception 'Verified external experience missing provenance'; end if;
  if exists (select 1 from public.external_experiences where michi_booking_enabled)
    then raise exception 'External experience incorrectly allows MICHI booking'; end if;
end $$;

select 'catalogue_counts' as report,
  (select count(*) from public.data_sources) as source_registry,
  (select count(*) from public.destinations where data_status = 'official_tourism') as official_destinations,
  (select count(*) from public.places where data_status = 'official_tourism') as official_places,
  (select count(*) from public.external_experiences where listing_source = 'external_official_listing') as external_experiences;
