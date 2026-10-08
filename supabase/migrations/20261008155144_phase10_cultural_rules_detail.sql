create or replace function public.sync_host_experience_cultural_rules(
  p_experience_id uuid,
  p_source_url text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  experience_row public.experiences%rowtype;
  organization text;
  source_row_id uuid;
  content_row_id uuid;
  rule_content text;
  content_digest text;
  rules_language text;
begin
  if (select auth.uid()) is null
     or public.current_app_role() <> 'host'
     or not private.verified_host((select auth.uid())) then
    raise exception 'verified host required' using errcode = '42501';
  end if;

  select * into experience_row
  from public.experiences
  where id = p_experience_id and host_id = (select auth.uid())
    and is_verified and status = 'published' and not is_paused
  for update;
  if not found then
    raise exception 'experience must be approved, published, and active' using errcode = '42501';
  end if;
  if p_source_url !~ ('^https?://[^/]+/experiences/' || experience_row.slug || '$') then
    raise exception 'canonical experience page URL required' using errcode = '22023';
  end if;

  select a.organization_name into organization
  from public.host_applications a
  where a.applicant_id = experience_row.host_id and a.status = 'verified'
  order by a.reviewed_at desc nulls last limit 1;
  rules_language := coalesce(experience_row.rules ->> 'language', 'en');
  if rules_language not in ('en', 'ja') then rules_language := 'en'; end if;

  rule_content := concat_ws(E'\n\n',
    'Photography: ' || experience_row.photography_policy,
    nullif('Participation: ' || coalesce(experience_row.rules ->> 'participation_rules', ''), 'Participation: '),
    nullif('Etiquette: ' || coalesce(experience_row.rules ->> 'etiquette_rules', ''), 'Etiquette: '),
    nullif('Eligibility: ' || coalesce(experience_row.rules ->> 'eligibility', ''), 'Eligibility: '),
    nullif('Meeting point: ' || experience_row.meeting_point, 'Meeting point: '),
    nullif('Accessibility details: ' || coalesce(experience_row.accessibility ->> 'notes', ''), 'Accessibility details: '),
    case when experience_row.accessibility ->> 'step_free' = 'true' then 'Accessibility: Host confirms step-free access.' end,
    case when experience_row.accessibility ->> 'wheelchair_access' = 'true' then 'Accessibility: Host confirms wheelchair access.' end,
    nullif('Cancellation: ' || coalesce(experience_row.booking_policy ->> 'cancellation_rules', ''), 'Cancellation: ')
  );
  if length(trim(rule_content)) < 10 then
    raise exception 'experience rules are incomplete' using errcode = '22023';
  end if;
  content_digest := md5(rule_content);

  insert into public.cultural_sources (
    title, source_url, publisher, authority_rank, language, status, verified_at,
    name, source_type, authority_level, default_verification_status,
    country, city, is_active, allow_automatic_ingestion, notes
  ) values (
    'Host-provided rules for ' || experience_row.title,
    p_source_url,
    'Provided directly by host' || case when organization is null then '' else ' — ' || organization end,
    5, rules_language, 'verified', now(),
    'Provided directly by host' || case when organization is null then '' else ' — ' || organization end,
    'host', 5, 'community_verified', 'JP',
    (select d.name from public.destinations d where d.id = experience_row.destination_id),
    true, false,
    'Host identity and experience ownership were reviewed. Rule content is provided directly by the host and is not government or official cultural guidance.'
  ) on conflict (source_url) do update set
    title = excluded.title,
    publisher = excluded.publisher,
    authority_rank = excluded.authority_rank,
    language = excluded.language,
    status = 'verified',
    verified_at = now(),
    name = excluded.name,
    source_type = 'host',
    authority_level = 5,
    default_verification_status = 'community_verified',
    city = excluded.city,
    is_active = true,
    allow_automatic_ingestion = false,
    notes = excluded.notes,
    updated_at = now()
  where public.cultural_sources.source_type = 'host'
  returning id into source_row_id;

  update public.cultural_content set is_active = false, updated_at = now()
  where source_id = source_row_id and experience_id = experience_row.id
    and category = 'host_rule' and is_active;

  insert into public.cultural_content (
    source_id, title, content, summary, category, subcategory, destination_id,
    experience_id, language, original_language, source_name, source_url, source_type,
    verification_status, authority_level, location_scope, last_verified_at,
    next_verification_at, is_time_sensitive, is_active, content_hash,
    status, verified_at, retrieved_at, metadata
  ) values (
    source_row_id,
    'Host-provided rules: ' || experience_row.title,
    rule_content,
    'Rules provided directly by the verified host for this specific MICHI experience.',
    'host_rule', 'experience_specific', experience_row.destination_id,
    experience_row.id, rules_language, rules_language, 'Provided directly by host', p_source_url,
    'host', 'community_verified', 5,
    jsonb_build_object('experience_id', experience_row.id, 'host_id', experience_row.host_id),
    now(), now() + interval '180 days', false, true, content_digest,
    'verified', now(), now(),
    jsonb_build_object('host_provided', true, 'official_status', false, 'organization', organization)
  ) on conflict (source_id, content_hash) do update set
    title = excluded.title, content = excluded.content, summary = excluded.summary,
    destination_id = excluded.destination_id, experience_id = excluded.experience_id,
    language = excluded.language, original_language = excluded.original_language,
    last_verified_at = now(), next_verification_at = excluded.next_verification_at,
    is_active = true, status = 'verified', verified_at = now(), updated_at = now(),
    metadata = excluded.metadata
  returning id into content_row_id;

  return source_row_id;
end;
$$;

revoke all on function public.sync_host_experience_cultural_rules(uuid, text) from public, anon;
grant execute on function public.sync_host_experience_cultural_rules(uuid, text) to authenticated;
