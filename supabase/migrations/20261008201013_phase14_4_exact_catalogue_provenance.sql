-- Replace the broad Kanazawa attraction index with the official page that
-- specifically describes Kanazawa Castle Park and Gyokusen-inmaru Garden.
update public.places
set official_url = 'https://visitkanazawa.jp/en/feature/detail_537.html',
    source_url = 'https://visitkanazawa.jp/en/feature/detail_537.html',
    canonical_source_url = 'https://visitkanazawa.jp/en/feature/detail_537.html',
    retrieved_at = now(),
    last_verified_at = now(),
    next_verification_at = now() + interval '180 days'
where slug = 'kanazawa-castle-park-gyokusen-inmaru'
  and source_url = 'https://visitkanazawa.jp/en/spot/index.html';

do $$
begin
  if not exists (
    select 1 from public.places
    where slug = 'kanazawa-castle-park-gyokusen-inmaru'
      and official_url = 'https://visitkanazawa.jp/en/feature/detail_537.html'
      and source_url = 'https://visitkanazawa.jp/en/feature/detail_537.html'
      and canonical_source_url = 'https://visitkanazawa.jp/en/feature/detail_537.html'
  ) then
    raise exception 'Expected Kanazawa Castle provenance update was not applied';
  end if;
end;
$$;
