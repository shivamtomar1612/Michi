-- Domain allowlist: active means allowed for individually selected, reviewed
-- records. It is not authorization to crawl the domain. Unknown robots/terms
-- access keeps automated fetching disabled in the importer.
insert into public.data_sources (name, base_url, source_type, authority_level, region, prefecture, city, is_official, is_active, retrieval_method, terms_url, robots_status, notes)
values
 ('Japan National Tourism Organization', 'https://www.japan.travel', 'national_tourism_board', 4, 'Japan', null, null, true, true, 'manual_reviewed_page', null, 'checked_allow_root', 'Official portal. robots.txt checked; /admin/ and /jp/ disallowed. Individual URLs only; summaries are concise and attributed.'),
 ('Japan Tourism Agency', 'https://www.mlit.go.jp', 'government', 5, 'Japan', null, null, true, true, 'manual_reviewed_page', null, 'not_checked_by_runtime', 'Responsible tourism page verified reachable; no automated crawling until site access terms and robots are reviewed.'),
 ('Agency for Cultural Affairs', 'https://www.bunka.go.jp', 'government', 5, 'Japan', null, null, true, true, 'manual_reviewed_page', null, 'not_checked_by_runtime', 'English cultural properties portal verified reachable; use for national heritage status.'),
 ('Kyoto Travel', 'https://kyoto.travel', 'official_city_tourism', 4, 'Kansai', 'Kyoto', 'Kyoto', true, true, 'manual_reviewed_page', null, 'not_checked_by_runtime', 'Official Kyoto City Travel Guide; exact area and guidance URLs are retained per record.'),
 ('Kyoto Travel Congestion Forecast', 'https://global.kyoto.travel', 'official_city_tourism', 4, 'Kansai', 'Kyoto', 'Kyoto', true, true, 'link_only', null, 'not_checked_by_runtime', 'Official congestion forecast link only. No machine-readable interface was verified; never treated as MICHI live data.'),
 ('VISIT KANAZAWA', 'https://visitkanazawa.jp', 'official_city_tourism', 4, 'Hokuriku', 'Ishikawa', 'Kanazawa', true, true, 'manual_reviewed_page', 'https://visitkanazawa.jp/en/terms/', 'not_checked_by_runtime', 'Official city tourism association pages verified. Terms prohibit reproducing site contents/images without permission; MICHI keeps concise normalized facts and links only. No images copied.'),
 ('Ishikawa Travel', 'https://www.ishikawatravel.jp', 'official_prefectural_tourism', 4, 'Hokuriku', 'Ishikawa', null, true, false, 'not_yet_reviewed', null, 'not_checked', 'Registered for future review; no records imported in this phase.'),
 ('HOT ISHIKAWA', 'https://www.hot-ishikawa.jp', 'official_prefectural_tourism', 4, 'Hokuriku', 'Ishikawa', null, true, false, 'not_yet_reviewed', null, 'not_checked', 'Japanese official tourism portal registered for future review; no records imported in this phase.'),
 ('Ishikawa Prefectural Government', 'https://www.pref.ishikawa.lg.jp', 'prefectural_government', 5, 'Hokuriku', 'Ishikawa', null, true, false, 'not_yet_reviewed', null, 'not_checked', 'Registered for future review; no records imported in this phase.'),
 ('Hida Takayama Official Tourism Guide', 'https://www.hidatakayama.or.jp', 'official_city_tourism', 4, 'Chubu', 'Gifu', 'Takayama', true, true, 'manual_reviewed_page', null, 'not_checked_by_runtime', 'Official Takayama tourism source verified. Current reviewed records are Japanese-language pages; retain original Japanese names and URLs.'),
 ('Takayama City Official Information', 'https://www.hida.jp', 'municipality', 5, 'Chubu', 'Gifu', 'Takayama', true, true, 'manual_reviewed_page', null, 'not_checked_by_runtime', 'Official Takayama city information portal verified; not used for imported place records in this snapshot.'),
 ('Visit Gifu', 'https://visitgifu.com', 'official_prefectural_tourism', 4, 'Chubu', 'Gifu', null, true, false, 'not_yet_reviewed', null, 'not_checked', 'Registered for future review; no records imported in this phase.'),
 ('Kutani Ware Kutani Kosen Kiln', 'https://kutanikosen.com', 'primary_operator', 3, 'Hokuriku', 'Ishikawa', 'Kanazawa', true, true, 'manual_reviewed_page', null, 'not_checked_by_runtime', 'Operator website linked from the official Kanazawa tourism listing; exact experience URLs are retained. Confirm robots/terms before automated refresh.'),
 ('Kanazawa Katani', 'https://www.k-katani.com', 'primary_operator', 3, 'Hokuriku', 'Ishikawa', 'Kanazawa', true, true, 'manual_reviewed_page', null, 'not_checked_by_runtime', 'Operator website linked from the official Kanazawa tourism listing; exact experience URL retained. Confirm robots/terms before automated refresh.')
on conflict (base_url) do nothing;

-- Curated, short descriptions only. Coordinates and unavailable/timing-sensitive
-- facts stay NULL. Each URL is the exact page reviewed for that record.
insert into public.destinations (name, name_ja, slug, prefecture, region, city, country, description, cultural_summary, status, data_source, source_url, source_id, source_name, source_type, source_authority, retrieved_at, last_verified_at, next_verification_at, verification_status, data_status, content_hash)
select v.name, v.name_ja, v.slug, v.prefecture, v.region, v.city, 'Japan', v.description, '', 'published', v.source_name, v.source_url, s.id, v.source_name, v.source_type, v.authority, timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '180 days', 'verified_official', 'official_tourism', md5(v.slug || '|' || v.description)
from (values
 ('Kyoto', '京都市', 'kyoto', 'Kyoto', 'Kansai', 'Kyoto', 'Kyoto Travel', 'official_city_tourism', 4, 'https://kyoto.travel/en/areas', 'Kyoto City describes distinct central, suburban, and natural areas for visitor discovery.'),
 ('Kanazawa', '金沢市', 'kanazawa', 'Ishikawa', 'Hokuriku', 'Kanazawa', 'VISIT KANAZAWA', 'official_city_tourism', 4, 'https://visitkanazawa.jp/en/traveler/', 'The official city guide frames Kanazawa around its preserved townscape, traditional arts and crafts, and resident life.'),
 ('Takayama', '高山市', 'takayama', 'Gifu', 'Chubu', 'Takayama', 'Hida Takayama Official Tourism Guide', 'official_city_tourism', 4, 'https://www.hidatakayama.or.jp/spot/detail_1101.html', 'The official city tourism guide identifies Takayama Old Town as a historic castle-town and merchant district.')
) as v(name,name_ja,slug,prefecture,region,city,source_name,source_type,authority,source_url,description)
join public.data_sources s on s.base_url = case v.source_name when 'Kyoto Travel' then 'https://kyoto.travel' when 'VISIT KANAZAWA' then 'https://visitkanazawa.jp' else 'https://www.hidatakayama.or.jp' end
on conflict (slug) do update set
  name = excluded.name, name_ja = excluded.name_ja, prefecture = excluded.prefecture, region = excluded.region,
  city = excluded.city, country = excluded.country, description = excluded.description,
  data_source = excluded.data_source, source_url = excluded.source_url, source_id = excluded.source_id,
  source_name = excluded.source_name, source_type = excluded.source_type, source_authority = excluded.source_authority,
  retrieved_at = excluded.retrieved_at, last_verified_at = excluded.last_verified_at,
  next_verification_at = excluded.next_verification_at, verification_status = excluded.verification_status,
  data_status = excluded.data_status, content_hash = excluded.content_hash, updated_at = now()
where public.destinations.source_id is null and public.destinations.data_status = 'unknown';

insert into public.places (
 destination_id, source_id, name, name_ja, slug, place_type, short_description,
 official_url, source_name, source_url, canonical_source_url, source_type, source_authority, retrieved_at,
 last_verified_at, next_verification_at, verification_status, data_status,
 original_language, location_scope, image_usage_status, content_hash
)
select d.id, s.id, v.name, v.name_ja, v.slug, v.place_type, v.description, v.source_url,
 v.source_name, v.source_url, regexp_replace(v.source_url, '/+$', ''), v.source_type, v.authority,
 case when v.slug = 'kanazawa-castle-park-gyokusen-inmaru' then timestamptz '2026-10-09 00:00:00+00' else timestamptz '2026-10-07 00:00:00+00' end,
 case when v.slug = 'kanazawa-castle-park-gyokusen-inmaru' then timestamptz '2026-10-09 00:00:00+00' else timestamptz '2026-10-07 00:00:00+00' end,
 case when v.slug = 'kanazawa-castle-park-gyokusen-inmaru' then timestamptz '2026-10-09 00:00:00+00' + interval '180 days' else timestamptz '2026-10-07 00:00:00+00' + interval '180 days' end, 'verified_official', 'official_tourism', v.language,
 v.city || ', Japan', 'do_not_display', md5(v.slug || '|' || v.description)
from (values
 ('kyoto','central-kyoto-city','Kyoto Travel','official_city_tourism',4,'en','Kyoto','Central Kyoto City','京都市中心部','historic_district','Kyoto’s central area includes the Nishiki Market and Shijo area, historic sites, and traditional culture.','https://kyoto.travel/en/areas/central/'),
 ('kyoto','saga-arashiyama','Kyoto Travel','official_city_tourism',4,'en','Kyoto','Saga & Arashiyama','嵯峨・嵐山','historic_district','The official guide describes Saga and Arashiyama in northwest Kyoto and identifies the bamboo grove and Togetsu-kyo Bridge.','https://kyoto.travel/en/areas/saga-arashiyama/'),
 ('kyoto','nishikyo','Kyoto Travel','official_city_tourism',4,'en','Kyoto','Nishikyo','西京','historic_district','The official guide describes western Kyoto areas including Katsura, Matsuo, and Oharano.','https://kyoto.travel/en/areas/nishikyo/'),
 ('kyoto','gion-higashiyama','Kyoto Travel','official_city_tourism',4,'en','Kyoto','Gion & Higashiyama','祇園・東山','historic_district','Kyoto’s official travel guidance identifies Gion and Higashiyama as areas with temples, shrines, and traditional restaurants.','https://kyoto.travel/en/travel-inspiration/choosing-accommodation-key-features-of-each-area/'),
 ('kyoto','fushimi','Kyoto Travel','official_city_tourism',4,'en','Kyoto','Fushimi','伏見','historic_district','The official Kyoto area guide describes Fushimi as an inland port town with canals and sake breweries.','https://kyoto.travel/en/areas'),
 ('kanazawa','kenrokuen-garden','VISIT KANAZAWA','official_city_tourism',4,'en','Kanazawa','Kenrokuen Garden','兼六園','garden','A garden beside Kanazawa Castle, with an official visitor page and published access, admission, and accessibility details.','https://visitkanazawa.jp/en/attractions/detail_10106.html'),
 ('kanazawa','higashi-chaya-district','VISIT KANAZAWA','official_city_tourism',4,'en','Kanazawa','Higashi Chaya District','ひがし茶屋街','historic_district','A historic teahouse district in Kanazawa; its official visitor listing identifies the preserved streetscape and visitor information.','https://visitkanazawa.jp/en/attractions/detail_10212.html'),
 ('kanazawa','nagamachi-samurai-district','VISIT KANAZAWA','official_city_tourism',4,'en','Kanazawa','Nagamachi Samurai District','長町武家屋敷跡','historic_district','A historic samurai district listed by the official Kanazawa tourism guide.','https://visitkanazawa.jp/en/attractions/detail_10195.html'),
 ('kanazawa','21st-century-museum-kanazawa','VISIT KANAZAWA','official_city_tourism',4,'en','Kanazawa','21st Century Museum of Contemporary Art, Kanazawa','金沢21世紀美術館','museum','A contemporary art museum listed by the official Kanazawa tourism guide.','https://visitkanazawa.jp/en/attractions/detail_10066.html'),
 ('kanazawa','omicho-market','VISIT KANAZAWA','official_city_tourism',4,'en','Kanazawa','Omicho Market','近江町市場','market','A food market listed by the official Kanazawa tourism guide. Current hours and vendor information are not stored.','https://visitkanazawa.jp/en/restaurants/detail_10030.html'),
 ('kanazawa','kanazawa-castle-park-gyokusen-inmaru','VISIT KANAZAWA','official_city_tourism',4,'en','Kanazawa','Kanazawa Castle Park and Gyokusen-inmaru Garden','金沢城公園・玉泉院丸庭園','castle','A historic park and garden listed by the official Kanazawa tourism guide.','https://visitkanazawa.jp/en/feature/detail_537.html'),
 ('takayama','hida-takayama-old-town','Hida Takayama Official Tourism Guide','official_city_tourism',4,'ja','Takayama','Hida Takayama Old Town','飛騨高山 古い町並','historic_district','The official Takayama tourism guide describes the district as a historic castle-town and merchant area with Edo-period streetscape.','https://www.hidatakayama.or.jp/spot/detail_1101.html'),
 ('takayama','takayama-jinya','Hida Takayama Official Tourism Guide','official_city_tourism',4,'ja','Takayama','Takayama Jinya','高山陣屋','heritage_site','A surviving Edo-period government office and nationally designated historic site, as described by the official city tourism guide.','https://www.hidatakayama.or.jp/spot/detail_1106.html'),
 ('takayama','hida-folk-village','Hida Takayama Official Tourism Guide','official_city_tourism',4,'ja','Takayama','Hida Folk Village','飛騨民俗村・飛騨の里','museum','An open-air museum of relocated traditional houses from the Hida region, according to the official city tourism guide.','https://www.hidatakayama.or.jp/spot/detail_1104.html'),
 ('takayama','takayama-festival-floats-exhibition-hall','Hida Takayama Official Tourism Guide','official_city_tourism',4,'ja','Takayama','Takayama Festival Floats Exhibition Hall','高山祭屋台会館','museum','The official city tourism guide describes an exhibition of festival floats at Sakurayama Hachimangu Shrine.','https://www.hidatakayama.or.jp/spot/detail_1108.html')
) as v(destination_slug,slug,source_name,source_type,authority,language,city,name,name_ja,place_type,description,source_url)
join public.destinations d on d.slug = v.destination_slug
join public.data_sources s on s.name = v.source_name
on conflict (source_id, canonical_source_url) do nothing;

insert into public.external_experiences (
 destination_id, place_id, source_id, operator_name, title, slug, short_description,
 category, duration_minutes, price_text, price_min_jpy, price_max_jpy, price_verified_at,
 external_booking_url, official_url, booking_mode, listing_source, michi_booking_enabled,
 accessibility_status, image_usage_status, source_name, source_url, canonical_source_url, source_type,
 source_authority, retrieved_at, last_verified_at, next_verification_at,
 verification_status, data_status, original_language, content_hash
)
select d.id, null, s.id, v.operator_name, v.title, v.slug, v.description, v.category,
 v.duration_minutes, v.price_text, v.price_min_jpy, v.price_max_jpy,
 case when v.price_min_jpy is not null then timestamptz '2026-10-07 00:00:00+00' else null end,
 v.booking_url, v.source_url, 'external', 'external_official_listing', false,
 'unknown', 'do_not_display', v.operator_name, v.source_url, regexp_replace(v.source_url, '/+$', ''), 'primary_operator', 3,
 timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '7 days', 'verified_primary', 'verified_primary', 'en',
 md5(v.slug || '|' || v.description || '|' || coalesce(v.price_text,''))
from (values
 ('kanazawa','Kutani Ware Kutani Kosen Kiln','Kutani Ware Etsuke (Drawing) Experience','kutani-kosen-etsuke','A pottery painting experience described by the operator; the finished piece is fired and sent later. Check the operator page for current terms and reservation details.','craft',60,'JPY 2,200–7,700 (shipping not included)',2200,7700,null,'https://kutanikosen.com/en/experience.html'),
 ('kanazawa','Kutani Ware Kutani Kosen Kiln','Kutani Ware Potter’s Wheel Experience','kutani-kosen-pottery-wheel','A potter’s wheel activity using Kutani ware clay, described by the operator. Current slots and remaining capacity are not published to MICHI.','craft',60,'JPY 5,500 per person; artwork and shipping extra',5500,5500,null,'https://kutanikosen.com/en/experience2.html'),
 ('kanazawa','Kanazawa Katani','Gold Leaf Pasting Experience','kanazawa-katani-gold-leaf','A gold-leaf pasting activity described by the operator. Price depends on the selected item; check the official page for current details.','craft',60,'From JPY 1,000; varies by selected item',1000,null,null,'https://www.k-katani.com/experience')
) as v(destination_slug,operator_name,title,slug,description,category,duration_minutes,price_text,price_min_jpy,price_max_jpy,booking_url,source_url)
join public.destinations d on d.slug = v.destination_slug
join public.data_sources s on s.name = v.operator_name
on conflict (source_id, canonical_source_url) do nothing;

-- Short structured travel guidance is stored in Phase 2's provenance-aware
-- cultural-content tables so Phase 6 can index it without a parallel corpus.
insert into public.cultural_sources (title, source_url, publisher, authority_rank, language, status, verified_at, stale_after, metadata)
values
 ('Responsible Travel in Kyoto', 'https://kyoto.travel/en/responsible-travel/', 'Kyoto Travel', 4, 'en', 'verified', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '180 days', jsonb_build_object('source_type','official_city_tourism','authority_level',4,'region','Kansai','city','Kyoto','retrieved_at','2026-10-07T00:00:00Z','data_status','official_tourism')),
 ('Kanazawa Mindful Travel Guide', 'https://visitkanazawa.jp/en/traveler/', 'VISIT KANAZAWA', 4, 'en', 'verified', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '180 days', jsonb_build_object('source_type','official_city_tourism','authority_level',4,'region','Hokuriku','city','Kanazawa','retrieved_at','2026-10-07T00:00:00Z','data_status','official_tourism')),
 ('Japanese Customs and Etiquette', 'https://www.japan.travel/en/responsible-travel-guide/japanese-customs-and-etiquette/', 'Japan National Tourism Organization', 4, 'en', 'verified', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '180 days', jsonb_build_object('source_type','national_tourism_board','authority_level',4,'location_scope','Japan','retrieved_at','2026-10-07T00:00:00Z','data_status','official_tourism')),
 ('Travel Etiquette for the Future', 'https://www.mlit.go.jp/kankocho/responsible-traveler/en.html', 'Japan Tourism Agency', 5, 'en', 'verified', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '180 days', jsonb_build_object('source_type','government','authority_level',5,'location_scope','Japan','retrieved_at','2026-10-07T00:00:00Z','data_status','official_tourism')),
 ('Introduction to Cultural Properties', 'https://www.bunka.go.jp/english/policy/cultural_properties/introduction/', 'Agency for Cultural Affairs', 5, 'en', 'verified', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '180 days', jsonb_build_object('source_type','government','authority_level',5,'location_scope','Japan','retrieved_at','2026-10-07T00:00:00Z','data_status','official_tourism'))
on conflict (source_url) do nothing;

insert into public.cultural_content (source_id, destination_id, title, content, language, content_hash, status, verified_at, stale_after, metadata)
select s.id, d.id, v.title, v.content, 'en', md5(v.content), 'verified', timestamptz '2026-10-07 00:00:00+00', timestamptz '2026-10-07 00:00:00+00' + interval '180 days',
 jsonb_build_object('source_name',v.publisher,'source_url',v.source_url,'source_type',case when v.publisher = 'Japan National Tourism Organization' then 'national_tourism_board' when v.publisher in ('Japan Tourism Agency','Agency for Cultural Affairs') then 'government' else 'official_city_tourism' end,'authority_level',case when v.publisher in ('Japan Tourism Agency','Agency for Cultural Affairs') then 5 else 4 end,'location_scope',coalesce(nullif(v.city,''),'Japan'),'original_language','en','retrieved_at','2026-10-07T00:00:00Z','data_status','official_tourism','copyright_note','Concise factual summary; link to original. No article text or imagery copied.')
from (values
 ('Responsible Travel in Kyoto','Kyoto Travel','https://kyoto.travel/en/responsible-travel/','Kyoto','Kyoto asks visitors to respect residential life and cultural sites, follow photography restrictions where posted, avoid obstructing narrow streets, and use public transport where practical.'),
 ('Kanazawa Mindful Travel Guide','VISIT KANAZAWA','https://visitkanazawa.jp/en/traveler/','Kanazawa','Kanazawa’s official guide encourages visitors to learn about local crafts and history, support local food culture, care for townscapes and nature, and share the city considerately with residents.'),
 ('Japanese Customs and Etiquette','Japan National Tourism Organization','https://www.japan.travel/en/responsible-travel-guide/japanese-customs-and-etiquette/','', 'JNTO recommends mindful behavior around others, observing local practice or asking when unsure, keeping places clean, and respecting punctuality for reservations. Venue-specific rules still take precedence.'),
 ('Travel Etiquette for the Future','Japan Tourism Agency','https://www.mlit.go.jp/kankocho/responsible-traveler/en.html','', 'The Japan Tourism Agency recommends learning about a destination before visiting, avoiding peak crowds where possible, respecting cultural assets and local people, disposing of waste responsibly, buying local, and taking time to engage with places.'),
 ('Introduction to Cultural Properties','Agency for Cultural Affairs','https://www.bunka.go.jp/english/policy/cultural_properties/introduction/','', 'The Agency for Cultural Affairs describes official categories of cultural properties including tangible and intangible properties, folk properties, monuments, cultural landscapes, and preservation districts. Use the agency’s designation records for official heritage status.')
) as v(title,publisher,source_url,city,content)
join public.cultural_sources s on s.source_url = v.source_url
left join public.destinations d on nullif(d.city, '') = nullif(v.city, '')
on conflict (source_id, content_hash) do nothing;

comment on table public.data_sources is 'Approved source registry. is_active permits selected record use only; it does not authorize broad crawling.';
comment on table public.external_experiences is 'External information listings. Never MICHI-bookable; never create MICHI slots from these records.';
select 'ingestion_snapshot' as report,
 (select count(*) from public.data_sources where is_active) as active_sources,
 (select count(*) from public.destinations where data_status = 'official_tourism' and source_id is not null) as verified_destinations,
 (select count(*) from public.places where data_status = 'official_tourism' and source_id is not null) as verified_places,
 (select count(*) from public.external_experiences where michi_booking_enabled = false and source_id is not null) as external_experiences;
